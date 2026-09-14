import { describe, expect, it } from 'vitest'
import { readOpenLiveUrl } from './openLiveClient'

describe('OpenLive adapter', () => {
  it('defaults safely when no runtime endpoint is configured', () => {
    const globalWithConfig = globalThis as typeof globalThis & { OPENLIVE_WS_URL?: unknown }
    const prior = globalWithConfig.OPENLIVE_WS_URL
    delete globalWithConfig.OPENLIVE_WS_URL
    expect(readOpenLiveUrl()).toBe('')
    if (prior !== undefined) globalWithConfig.OPENLIVE_WS_URL = prior
  })
})
