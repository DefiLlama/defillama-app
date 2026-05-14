import { describe, expect, it } from 'vitest'
import {
	getSettingsIntentFromQuery,
	readPendingSettingsIntent,
	stashSettingsIntent
} from '~/containers/LlamaAI/utils/settingsIntent'

class MemoryStorage {
	private values = new Map<string, string>()

	getItem(key: string) {
		return this.values.get(key) ?? null
	}

	setItem(key: string, value: string) {
		this.values.set(key, value)
	}

	removeItem(key: string) {
		this.values.delete(key)
	}
}

describe('settingsIntent', () => {
	it('parses an authenticated Telegram login intent for the integrations tab', () => {
		expect(getSettingsIntentFromQuery({ tglogin: 'telegram-token', keep: '1' })).toEqual({
			initialState: { tab: 'integrations', tgloginToken: 'telegram-token' },
			nextQuery: { keep: '1' }
		})
	})

	it('stashes and consumes unauthenticated Telegram login intent after login', () => {
		const storage = new MemoryStorage()

		stashSettingsIntent(storage, { tab: 'integrations', tgloginToken: 'telegram-token' })

		expect(readPendingSettingsIntent(storage)).toEqual({ tab: 'integrations', tgloginToken: 'telegram-token' })
		expect(readPendingSettingsIntent(storage)).toBeNull()
	})

	it('parses the settings modal tab intent and removes consumed query params', () => {
		expect(getSettingsIntentFromQuery({ modal: 'settings', tab: 'integrations', chain: 'Ethereum' })).toEqual({
			initialState: { tab: 'integrations', tgloginToken: null },
			nextQuery: { chain: 'Ethereum' }
		})
	})
})
