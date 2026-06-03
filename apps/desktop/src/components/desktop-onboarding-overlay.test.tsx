import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { $desktopOnboarding, type DesktopOnboardingState, type OnboardingContext } from '@/store/onboarding'
import type { OAuthProvider } from '@/types/hermes'

import { Picker } from './desktop-onboarding-overlay'

function provider(id: string, name = id): OAuthProvider {
  return {
    cli_command: `hermes login ${id}`,
    docs_url: `https://example.com/${id}`,
    flow: 'pkce',
    id,
    name,
    status: { logged_in: false }
  }
}

function setProviders(providers: OAuthProvider[]) {
  $desktopOnboarding.set({
    configured: false,
    flow: { status: 'idle' },
    mode: 'oauth',
    providers,
    reason: null,
    requested: false,
    manual: false
  } satisfies DesktopOnboardingState)
}

const ctx: OnboardingContext = { requestGateway: async () => undefined as never }

afterEach(() => {
  cleanup()
  $desktopOnboarding.set({
    configured: null,
    flow: { status: 'idle' },
    mode: 'oauth',
    providers: null,
    reason: null,
    requested: false,
    manual: false
  })
})

describe('onboarding Picker', () => {
  it('features Harbor Works and hides upstream providers', () => {
    setProviders([
      provider('anthropic', 'Anthropic Claude'),
      provider('harbor', 'Harbor Works'),
      provider('nous', 'Nous Portal'),
      provider('openai-codex', 'OpenAI Codex (ChatGPT)')
    ])
    render(<Picker ctx={ctx} />)

    expect(screen.getByText('Harbor Works')).toBeTruthy()
    expect(screen.getByText('Recommended')).toBeTruthy()
    expect(screen.getByText('OpenAI Codex / ChatGPT')).toBeTruthy()
    expect(screen.queryByText('Anthropic Claude')).toBeNull()
    expect(screen.queryByText('Nous Portal')).toBeNull()
  })

  it('synthesizes Harbor Works when the backend only reports Codex', () => {
    setProviders([provider('openai-codex', 'OpenAI Codex (ChatGPT)')])
    render(<Picker ctx={ctx} />)

    expect(screen.getByText('Harbor Works')).toBeTruthy()
    expect(screen.getByText('OpenAI Codex / ChatGPT')).toBeTruthy()
    expect(screen.getByText('Recommended')).toBeTruthy()
  })

  it('only offers Harbor Works token in manual API key mode', () => {
    setProviders([provider('harbor', 'Harbor Works'), provider('openai-codex', 'OpenAI Codex (ChatGPT)')])
    render(<Picker ctx={ctx} />)

    fireEvent.click(screen.getByRole('button', { name: 'I have an API key' }))

    expect(screen.getByText('Harbor Works token')).toBeTruthy()
    expect(screen.queryByText('OpenRouter')).toBeNull()
    expect(screen.queryByText('OpenAI')).toBeNull()
  })
})
