import { describe, expect, it } from 'vitest'
import type { TelegramStatus } from '~/containers/LlamaAI/api/telegram'
import { getIntegrationRowResetKey } from '~/containers/LlamaAI/components/IntegrationRow'
import {
	deriveTelegramLocalState,
	deriveTelegramLinkState,
	getTelegramStatusRefetchInterval,
	type IntegrationLinkLocalState
} from '~/containers/LlamaAI/hooks/useIntegrationLink'

const linked: TelegramStatus = {
	link: { state: 'linked', telegramUsername: 'defillama', linkedAt: '2026-05-14T00:00:00.000Z' },
	pending: null
}

const unlinked: TelegramStatus = { link: { state: 'unlinked' }, pending: null }

const pending: TelegramStatus = {
	link: { state: 'unlinked' },
	pending: {
		token: 'pending-token',
		deepLink: 'https://t.me/defillama_bot?start=pending-token',
		expiresAt: '2026-05-14T00:05:00.000Z'
	}
}

const linkedWithPending: TelegramStatus = {
	...linked,
	pending: pending.pending
}

function derive(status: TelegramStatus | null, localState: IntegrationLinkLocalState = { status: 'idle' }) {
	return deriveTelegramLinkState({
		status,
		localState,
		isLoading: false,
		isStarting: false,
		isConfirming: false
	})
}

describe('useIntegrationLink state helpers', () => {
	it('renders linked with pending as awaiting Telegram confirmation', () => {
		expect(derive(linkedWithPending)).toEqual({
			status: 'awaiting_tg',
			token: 'pending-token',
			deepLink: 'https://t.me/defillama_bot?start=pending-token'
		})
		expect(getTelegramStatusRefetchInterval(linkedWithPending)).toBe(2000)
	})

	it('renders unlinked without pending as idle and stops polling', () => {
		expect(derive(unlinked)).toEqual({ status: 'idle' })
		expect(getTelegramStatusRefetchInterval(unlinked)).toBe(false)
	})

	it('renders linked without pending as linked and stops polling', () => {
		expect(derive(linked)).toEqual({
			status: 'linked',
			username: 'defillama',
			linkedAt: '2026-05-14T00:00:00.000Z'
		})
		expect(getTelegramStatusRefetchInterval(linked)).toBe(false)
	})

	it('returns to query-derived linked state after switch confirmation is cancelled', () => {
		expect(derive(linked, { status: 'idle' })).toEqual({
			status: 'linked',
			username: 'defillama',
			linkedAt: '2026-05-14T00:00:00.000Z'
		})
	})

	it('changes the reset key when a new tglogin token arrives', () => {
		expect(getIntegrationRowResetKey('first-token', linked)).not.toBe(getIntegrationRowResetKey('second-token', linked))
		expect(getIntegrationRowResetKey(null, pending)).toBe('pending:pending-token')
	})

	it('keeps forced switch confirmation errors visible while a tglogin token is still present', () => {
		expect(
			deriveTelegramLocalState({
				switchConfirmation: null,
				confirmLinked: false,
				initialTgloginToken: 'deep-link-token',
				startError: null,
				unlinkError: null,
				confirmError: new Error('Switch failed'),
				confirmWasForced: true,
				statusError: null,
				hasStatusData: true
			})
		).toEqual({ status: 'error', message: 'Switch failed' })
	})

	it('surfaces status load errors when there is no status data to render', () => {
		expect(
			deriveTelegramLocalState({
				switchConfirmation: null,
				confirmLinked: false,
				initialTgloginToken: null,
				startError: null,
				unlinkError: null,
				confirmError: null,
				confirmWasForced: false,
				statusError: new Error('Failed to load Telegram status'),
				hasStatusData: false
			})
		).toEqual({ status: 'error', message: 'Failed to load Telegram status' })
	})
})
