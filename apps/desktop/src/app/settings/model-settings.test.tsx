import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getGlobalModelInfo = vi.fn()
const getGlobalModelOptions = vi.fn()
const getAuxiliaryModels = vi.fn()
const listOAuthProviders = vi.fn()
const setModelAssignment = vi.fn()
const startManualOnboarding = vi.fn()
const startProviderOAuth = vi.fn()

vi.mock('@/hermes', () => ({
  getGlobalModelInfo: () => getGlobalModelInfo(),
  getGlobalModelOptions: () => getGlobalModelOptions(),
  getAuxiliaryModels: () => getAuxiliaryModels(),
  listOAuthProviders: () => listOAuthProviders(),
  setModelAssignment: (body: unknown) => setModelAssignment(body)
}))

vi.mock('@/store/onboarding', () => ({
  startManualOnboarding: (reason: string) => startManualOnboarding(reason),
  startProviderOAuth: (provider: unknown, ctx: unknown) => startProviderOAuth(provider, ctx)
}))

beforeEach(() => {
  getGlobalModelInfo.mockResolvedValue({ provider: 'harbor', model: 'claude-sonnet-4.6' })
  getGlobalModelOptions.mockResolvedValue({
    providers: [
      { name: 'Harbor Works', slug: 'harbor', models: ['claude-sonnet-4.6'] },
      { name: 'OpenAI Codex', slug: 'openai-codex', models: ['gpt-5.2-codex'] },
      { name: 'Anthropic Claude', slug: 'anthropic', models: ['claude-opus'] }
    ]
  })
  listOAuthProviders.mockResolvedValue({
    providers: [
      {
        id: 'harbor',
        name: 'Harbor Works',
        flow: 'device_code',
        cli_command: 'hw auth login',
        docs_url: 'https://harborworks.ai',
        status: { logged_in: true, source_label: 'Harbor Works CLI' }
      },
      {
        id: 'openai-codex',
        name: 'OpenAI Codex / ChatGPT',
        flow: 'device_code',
        cli_command: 'hermes auth login openai-codex',
        docs_url: 'https://openai.com',
        status: { logged_in: false }
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        flow: 'pkce',
        cli_command: 'hermes auth login anthropic',
        docs_url: 'https://anthropic.com',
        status: { logged_in: false }
      }
    ]
  })
  getAuxiliaryModels.mockResolvedValue({
    main: { provider: 'harbor', model: 'claude-sonnet-4.6' },
    tasks: [{ task: 'vision', provider: 'auto', model: '', base_url: '' }]
  })
  setModelAssignment.mockResolvedValue({ provider: 'harbor', model: 'claude-sonnet-4.6', gateway_tools: [] })
  startProviderOAuth.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function renderModelSettings(requestGateway = vi.fn()) {
  const { ModelSettings } = await import('./model-settings')

  return render(<ModelSettings requestGateway={requestGateway} />)
}

describe('ModelSettings', () => {
  it('loads and shows the current main model', async () => {
    await renderModelSettings()

    await waitFor(() => expect(getGlobalModelInfo).toHaveBeenCalled())
    expect(screen.getByText('harbor / claude-sonnet-4.6')).toBeTruthy()
  })

  it('only renders Harbor Works and OpenAI Codex provider sign-in rows', async () => {
    await renderModelSettings()

    await screen.findByText('OpenAI Codex / ChatGPT')
    expect(screen.getAllByText('Harbor Works').length).toBeGreaterThan(0)
    expect(screen.getByText('OpenAI Codex / ChatGPT')).toBeTruthy()
    expect(screen.queryByText('Anthropic Claude')).toBeNull()
  })

  it('starts OpenAI Codex OAuth from settings', async () => {
    const requestGateway = vi.fn()
    await renderModelSettings(requestGateway)

    fireEvent.click(await screen.findByRole('button', { name: 'Sign in to OpenAI Codex / ChatGPT' }))

    await waitFor(() => expect(startProviderOAuth).toHaveBeenCalled())
    expect(startManualOnboarding).toHaveBeenCalledWith('Connect OpenAI Codex / ChatGPT.')
    expect(startProviderOAuth.mock.calls[0][0].id).toBe('openai-codex')
    expect(startProviderOAuth.mock.calls[0][1].requestGateway).toBe(requestGateway)
  })

  it('renders the auxiliary task rows', async () => {
    await renderModelSettings()

    expect(await screen.findByText('Vision')).toBeTruthy()
    expect(screen.getAllByText('auto · use main model').length).toBeGreaterThan(0)
  })

  it('assigns an auxiliary task to the main model via setModelAssignment', async () => {
    await renderModelSettings()

    // One "Set to main" button per task slot; the first is Vision.
    const setToMainButtons = await screen.findAllByRole('button', { name: 'Set to main' })
    fireEvent.click(setToMainButtons[0])

    await waitFor(() =>
      expect(setModelAssignment).toHaveBeenCalledWith({
        model: 'claude-sonnet-4.6',
        provider: 'harbor',
        scope: 'auxiliary',
        task: 'vision'
      })
    )
  })
})
