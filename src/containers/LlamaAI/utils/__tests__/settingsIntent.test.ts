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

	it('parses an authenticated Slack login intent for the integrations tab', () => {
		expect(getSettingsIntentFromQuery({ slacklogin: 'slack-token', keep: '1', modal: 'settings', tab: 'app' })).toEqual(
			{
				initialState: { tab: 'integrations', tgloginToken: null, slackloginToken: 'slack-token' },
				nextQuery: { keep: '1' }
			}
		)
	})

	it('stashes and consumes unauthenticated Slack login intent after login', () => {
		const storage = new MemoryStorage()

		stashSettingsIntent(storage, { tab: 'integrations', tgloginToken: null, slackloginToken: 'slack-token' })

		expect(readPendingSettingsIntent(storage)).toEqual({
			tab: 'integrations',
			tgloginToken: null,
			slackloginToken: 'slack-token'
		})
		expect(readPendingSettingsIntent(storage)).toBeNull()
	})

	it('parses the settings modal tab intent and removes consumed query params', () => {
		expect(getSettingsIntentFromQuery({ modal: 'settings', tab: 'integrations', chain: 'Ethereum' })).toEqual({
			initialState: { tab: 'integrations', tgloginToken: null },
			nextQuery: { chain: 'Ethereum' }
		})
	})

	it('parses Slack callback intent for integrations and removes callback query params', () => {
		expect(
			getSettingsIntentFromQuery({
				slack: 'connected',
				team: 'Llama Labs',
				detail: 'ok',
				modal: 'settings',
				tab: 'app',
				chain: 'Ethereum'
			})
		).toEqual({
			initialState: {
				tab: 'integrations',
				tgloginToken: null,
				slackResult: 'connected',
				slackTeamName: 'Llama Labs',
				slackErrorDetail: 'ok'
			},
			nextQuery: { chain: 'Ethereum' }
		})
	})

	it('stashes and consumes unauthenticated Slack callback intent after login', () => {
		const storage = new MemoryStorage()

		stashSettingsIntent(storage, {
			tab: 'integrations',
			tgloginToken: null,
			slackResult: 'slack_failed',
			slackTeamName: 'Llama Labs',
			slackErrorDetail: 'access_denied'
		})

		expect(readPendingSettingsIntent(storage)).toEqual({
			tab: 'integrations',
			tgloginToken: null,
			slackResult: 'slack_failed',
			slackTeamName: 'Llama Labs',
			slackErrorDetail: 'access_denied'
		})
		expect(readPendingSettingsIntent(storage)).toBeNull()
	})
})
