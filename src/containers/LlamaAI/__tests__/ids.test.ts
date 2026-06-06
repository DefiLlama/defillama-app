import { describe, expect, it } from 'vitest'
import { toMessageId, toSessionId, toShareToken } from '~/containers/LlamaAI/ids'

describe('LlamaAI branded ids', () => {
	it('brands boundary ids without changing runtime values', () => {
		expect(toSessionId('session-1')).toBe('session-1')
		expect(toMessageId('message-1')).toBe('message-1')
		expect(toShareToken('share-1')).toBe('share-1')
	})
})
