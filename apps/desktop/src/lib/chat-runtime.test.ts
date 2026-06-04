import { describe, expect, it } from 'vitest'

import { coerceThinkingText, normalizeSlashCommandText } from './chat-runtime'

describe('coerceThinkingText', () => {
  it('strips streaming status prefixes from thinking deltas', () => {
    expect(coerceThinkingText("◉_◉ processing... checking the user's request")).toBe("checking the user's request")
    expect(coerceThinkingText('(¬‿¬) analyzing... reading the file')).toBe('reading the file')
  })

  it('drops empty thinking rewrite placeholder text', () => {
    expect(
      coerceThinkingText(
        "◉_◉ processing... I don't see any current rewritten thinking or next thinking to process. Could you provide the thinking content you'd like me to rewrite?"
      )
    ).toBe('')
  })
})

describe('normalizeSlashCommandText', () => {
  it('keeps plain slash commands intact', () => {
    expect(normalizeSlashCommandText('/model')).toBe('/model')
    expect(normalizeSlashCommandText('/model harbor claude-sonnet-4.6')).toBe('/model harbor claude-sonnet-4.6')
  })

  it('converts composer slash directive tokens into slash commands', () => {
    expect(normalizeSlashCommandText('@slash:`model|0`')).toBe('/model')
    expect(normalizeSlashCommandText('@slash:`model|0` harbor claude-sonnet-4.6')).toBe(
      '/model harbor claude-sonnet-4.6'
    )
  })

  it('ignores regular prompt text', () => {
    expect(normalizeSlashCommandText('tell me about /model')).toBeNull()
  })
})
