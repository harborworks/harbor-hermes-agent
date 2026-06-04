import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  getAuxiliaryModels,
  getGlobalModelInfo,
  getGlobalModelOptions,
  listOAuthProviders,
  setModelAssignment
} from '@/hermes'
import type { AuxiliaryModelsResponse, ModelOptionProvider } from '@/hermes'
import { Cpu, Loader2, Sparkles } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { startManualOnboarding, startProviderOAuth } from '@/store/onboarding'
import type { OAuthProvider } from '@/types/hermes'

import { CONTROL_TEXT } from './constants'
import { ListRow, LoadingState, Pill, SectionHeading } from './primitives'

// Mirrors `_AUX_TASK_SLOTS` in hermes_cli/web_server.py. Friendly labels and
// hints make the assignments readable; raw task keys (vision, mcp, …) are
// opaque to most users.
interface AuxTaskMeta {
  hint: string
  key: string
  label: string
}

const AUX_TASKS: readonly AuxTaskMeta[] = [
  { key: 'vision', label: 'Vision', hint: 'Image analysis' },
  { key: 'web_extract', label: 'Web extract', hint: 'Page summarization' },
  { key: 'compression', label: 'Compression', hint: 'Context compaction' },
  { key: 'session_search', label: 'Session search', hint: 'Recall queries' },
  { key: 'skills_hub', label: 'Skills hub', hint: 'Skill search' },
  { key: 'approval', label: 'Approval', hint: 'Smart auto-approve' },
  { key: 'mcp', label: 'MCP', hint: 'MCP tool routing' },
  { key: 'title_generation', label: 'Title gen', hint: 'Session titles' },
  { key: 'curator', label: 'Curator', hint: 'Skill-usage review' }
]

const NO_PROVIDERS: readonly ModelOptionProvider[] = [{ name: '—', slug: '', models: [] }]
const HARBOR_WORKS_PROVIDER_SLUGS = new Set(['harbor', 'openai-codex'])

function harborWorksProviders(providers: readonly ModelOptionProvider[]): ModelOptionProvider[] {
  return providers.filter(provider => HARBOR_WORKS_PROVIDER_SLUGS.has(String(provider.slug).toLowerCase()))
}

function harborWorksOAuthProviders(providers: readonly OAuthProvider[]): OAuthProvider[] {
  return providers.filter(provider => HARBOR_WORKS_PROVIDER_SLUGS.has(String(provider.id).toLowerCase()))
}

function providerDescription(provider: OAuthProvider) {
  const detail = provider.status?.source_label || provider.status?.token_preview || ''

  if (provider.status?.logged_in) {
    return detail ? `Connected via ${detail}` : 'Connected'
  }

  return provider.flow === 'device_code'
    ? 'Opens a verification page in your browser.'
    : 'Opens a browser sign-in flow.'
}

interface ModelSettingsProps {
  /** Notified after the main model is applied, so live UI stores can sync. */
  onMainModelChanged?: (provider: string, model: string) => void
  requestGateway?: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>
}

export function ModelSettings({ onMainModelChanged, requestGateway }: ModelSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mainModel, setMainModel] = useState<{ model: string; provider: string } | null>(null)
  const [providers, setProviders] = useState<ModelOptionProvider[]>([])
  const [oauthProviders, setOAuthProviders] = useState<OAuthProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [auxiliary, setAuxiliary] = useState<AuxiliaryModelsResponse | null>(null)
  const [applying, setApplying] = useState(false)
  const [signingInProvider, setSigningInProvider] = useState('')
  const [editingAuxTask, setEditingAuxTask] = useState<null | string>(null)
  const [auxDraft, setAuxDraft] = useState<{ model: string; provider: string }>({ model: '', provider: '' })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [modelInfo, modelOptions, auxiliaryModels, oauth] = await Promise.all([
        getGlobalModelInfo(),
        getGlobalModelOptions(),
        getAuxiliaryModels(),
        listOAuthProviders().catch(() => ({ providers: [] }))
      ])

      const visibleProviders = harborWorksProviders(modelOptions.providers || [])
      const fallbackProvider = visibleProviders[0]
      const configuredProvider = visibleProviders.find(provider => provider.slug === modelInfo.provider)
      const nextProvider = configuredProvider?.slug || fallbackProvider?.slug || ''
      const configuredModels = configuredProvider?.models ?? []
      const fallbackModels = fallbackProvider?.models ?? []

      const nextModel =
        configuredModels.find(model => model === modelInfo.model) ||
        configuredModels[0] ||
        fallbackModels[0] ||
        ''

      setMainModel({
        model: configuredProvider ? modelInfo.model : nextModel,
        provider: configuredProvider ? modelInfo.provider : nextProvider
      })
      setProviders(visibleProviders)
      setOAuthProviders(harborWorksOAuthProviders(oauth.providers || []))
      setSelectedProvider(prev => (visibleProviders.some(provider => provider.slug === prev) ? prev : nextProvider))
      setSelectedModel(prev => {
        const provider = visibleProviders.find(item => item.slug === nextProvider)
        const models = provider?.models ?? []

        return models.includes(prev) ? prev : nextModel
      })
      setAuxiliary(auxiliaryModels)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const providerOptions = providers.length ? providers : NO_PROVIDERS

  const selectedProviderModels = useMemo(
    () => providers.find(provider => provider.slug === selectedProvider)?.models ?? [],
    [providers, selectedProvider]
  )

  const auxDraftProviderModels = useMemo(
    () => providers.find(provider => provider.slug === auxDraft.provider)?.models ?? [],
    [auxDraft.provider, providers]
  )

  const changeMainProvider = useCallback(
    (providerSlug: string) => {
      const provider = providers.find(item => item.slug === providerSlug)

      setSelectedProvider(providerSlug)
      setSelectedModel(provider?.models?.[0] || '')
    },
    [providers]
  )

  const applyMainModel = useCallback(async () => {
    if (!selectedProvider || !selectedModel) {
      return
    }

    setApplying(true)
    setError('')

    try {
      const result = await setModelAssignment({ model: selectedModel, provider: selectedProvider, scope: 'main' })
      const provider = result.provider || selectedProvider
      const model = result.model || selectedModel
      setMainModel({ provider, model })
      onMainModelChanged?.(provider, model)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }, [onMainModelChanged, refresh, selectedModel, selectedProvider])

  const setAuxiliaryToMain = useCallback(
    async (task: string) => {
      if (!mainModel) {
        return
      }

      setApplying(true)
      setError('')

      try {
        await setModelAssignment({ model: mainModel.model, provider: mainModel.provider, scope: 'auxiliary', task })
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setApplying(false)
      }
    },
    [mainModel, refresh]
  )

  const applyAuxiliaryDraft = useCallback(
    async (task: string) => {
      if (!auxDraft.provider || !auxDraft.model) {
        return
      }

      setApplying(true)
      setError('')

      try {
        await setModelAssignment({ model: auxDraft.model, provider: auxDraft.provider, scope: 'auxiliary', task })
        setEditingAuxTask(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setApplying(false)
      }
    },
    [auxDraft, refresh]
  )

  const beginAuxiliaryEdit = useCallback(
    (task: string) => {
      const current = auxiliary?.tasks.find(entry => entry.task === task)

      const initialProvider =
        current?.provider && current.provider !== 'auto' ? current.provider : (mainModel?.provider ?? '')

      const initialModel = current?.model || mainModel?.model || ''
      setAuxDraft({ provider: initialProvider, model: initialModel })
      setEditingAuxTask(task)
    },
    [auxiliary, mainModel]
  )

  const resetAuxiliaryModels = useCallback(async () => {
    if (!mainModel) {
      return
    }

    setApplying(true)
    setError('')

    try {
      await setModelAssignment({
        model: mainModel.model,
        provider: mainModel.provider,
        scope: 'auxiliary',
        task: '__reset__'
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }, [mainModel, refresh])

  const beginOAuth = useCallback(
    async (provider: OAuthProvider) => {
      if (!requestGateway) {
        setError('Gateway is still starting. Try again in a moment.')

        return
      }

      setSigningInProvider(provider.id)
      setError('')
      startManualOnboarding(`Connect ${provider.name}.`)

      try {
        await startProviderOAuth(provider, {
          requestGateway,
          onCompleted: () => {
            void refresh()
          }
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setSigningInProvider('')
      }
    },
    [refresh, requestGateway]
  )

  if (loading && !mainModel) {
    return <LoadingState label="Loading model configuration..." />
  }

  return (
    <div className="grid gap-6">
      <section>
        <SectionHeading icon={Sparkles} meta="Harbor Works / Codex" title="Provider sign-in" />
        <p className="mb-3 text-xs text-muted-foreground">
          This Harbor Works build only exposes Harbor Works and OpenAI Codex as desktop providers.
        </p>
        <div className="divide-y divide-border/40 rounded-md border border-border/60">
          {oauthProviders.map(provider => {
            const connected = provider.status?.logged_in
            const busy = signingInProvider === provider.id

            return (
              <ListRow
                action={
                  <Button
                    aria-label={`${connected ? 'Reconnect' : 'Sign in to'} ${provider.name}`}
                    disabled={!requestGateway || busy}
                    onClick={() => void beginOAuth(provider)}
                    size="sm"
                    variant={connected ? 'outline' : 'default'}
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    {busy ? 'Starting...' : connected ? 'Reconnect' : 'Sign in'}
                  </Button>
                }
                description={providerDescription(provider)}
                key={provider.id}
                title={provider.name}
              />
            )
          })}
          {oauthProviders.length === 0 && (
            <ListRow description="Provider sign-in metadata is not available from the gateway yet." title="No providers" />
          )}
        </div>
      </section>

      <section>
        <SectionHeading
          icon={Sparkles}
          meta={mainModel ? `${mainModel.provider} / ${mainModel.model}` : undefined}
          title="Main model"
        />
        <p className="mb-3 text-xs text-muted-foreground">
          Applies to new sessions. Use the model picker in the composer to hot-swap the active chat.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select onValueChange={changeMainProvider} value={selectedProvider}>
            <SelectTrigger className={cn('min-w-40', CONTROL_TEXT)}>
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map(provider => (
                <SelectItem key={provider.slug || 'none'} value={provider.slug || 'none'}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedModel} value={selectedModel}>
            <SelectTrigger className={cn('min-w-60', CONTROL_TEXT)}>
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {(selectedProviderModels.length ? selectedProviderModels : []).map(model => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!selectedProvider || !selectedModel || applying} onClick={() => void applyMainModel()} size="sm">
            {applying ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {applying ? 'Applying...' : 'Apply'}
          </Button>
        </div>
        {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
      </section>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <SectionHeading icon={Cpu} title="Auxiliary models" />
          <Button
            disabled={!mainModel || applying}
            onClick={() => void resetAuxiliaryModels()}
            size="sm"
            variant="outline"
          >
            Reset all to main
          </Button>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Helper tasks run on the main model by default. Assign a dedicated model to any task to override.
        </p>
        <div className="divide-y divide-border/40">
          {AUX_TASKS.map(meta => {
            const current = auxiliary?.tasks.find(entry => entry.task === meta.key)
            const isAuto = !current || !current.provider || current.provider === 'auto'
            const isEditing = editingAuxTask === meta.key

            return (
              <ListRow
                action={
                  !isEditing && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        disabled={!mainModel || applying}
                        onClick={() => void setAuxiliaryToMain(meta.key)}
                        size="sm"
                        variant="ghost"
                      >
                        Set to main
                      </Button>
                      <Button
                        disabled={!providers.length || applying}
                        onClick={() => beginAuxiliaryEdit(meta.key)}
                        size="sm"
                        variant="outline"
                      >
                        Change
                      </Button>
                    </div>
                  )
                }
                below={
                  isEditing && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2">
                      <Select
                        onValueChange={value => setAuxDraft(prev => ({ ...prev, provider: value, model: '' }))}
                        value={auxDraft.provider}
                      >
                        <SelectTrigger className={cn('min-w-32', CONTROL_TEXT)}>
                          <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {providerOptions.map(provider => (
                            <SelectItem key={provider.slug || 'none'} value={provider.slug || 'none'}>
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        onValueChange={value => setAuxDraft(prev => ({ ...prev, model: value }))}
                        value={auxDraft.model}
                      >
                        <SelectTrigger className={cn('min-w-48', CONTROL_TEXT)}>
                          <SelectValue placeholder="Model" />
                        </SelectTrigger>
                        <SelectContent>
                          {(auxDraftProviderModels.length ? auxDraftProviderModels : []).map(model => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        disabled={!auxDraft.provider || !auxDraft.model || applying}
                        onClick={() => void applyAuxiliaryDraft(meta.key)}
                        size="sm"
                      >
                        {applying ? 'Applying...' : 'Apply'}
                      </Button>
                      <Button onClick={() => setEditingAuxTask(null)} size="sm" variant="ghost">
                        Cancel
                      </Button>
                    </div>
                  )
                }
                description={
                  <span className="font-mono text-[0.68rem]">
                    {isAuto ? 'auto · use main model' : `${current.provider} · ${current.model || '(provider default)'}`}
                  </span>
                }
                key={meta.key}
                title={
                  <span className="flex items-baseline gap-2">
                    {meta.label}
                    <Pill>{meta.hint}</Pill>
                  </span>
                }
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}
