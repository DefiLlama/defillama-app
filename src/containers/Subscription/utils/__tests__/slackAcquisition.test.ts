import { describe, expect, it, vi } from 'vitest'
import {
	applySlackAcquisitionFromQuery,
	persistSlackAcquisitionIfFirst,
	readSlackAcquisition
} from '~/containers/Subscription/utils/slackAcquisition'

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

describe('slackAcquisition', () => {
	it('stores and consumes valid Slack acquisition query params', () => {
		const storage = new MemoryStorage()

		applySlackAcquisitionFromQuery({ from: 'slack', entry: 'dm' }, storage)

		expect(readSlackAcquisition(storage)).toEqual({ source: 'slack', entry: 'dm' })
		expect(readSlackAcquisition(storage)).toBeNull()
	})

	it('defaults unknown Slack entries to mention', () => {
		const storage = new MemoryStorage()

		applySlackAcquisitionFromQuery({ from: 'slack', entry: 'unknown' }, storage)

		expect(readSlackAcquisition(storage)).toEqual({ source: 'slack', entry: 'mention' })
	})

	it('clears stored acquisition when the query source is not Slack', () => {
		const storage = new MemoryStorage()

		applySlackAcquisitionFromQuery({ from: 'slack', entry: 'apphome' }, storage)
		applySlackAcquisitionFromQuery({ from: 'email' }, storage)

		expect(readSlackAcquisition(storage)).toBeNull()
	})

	it('persists signup source only when user settings do not already have one', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ settings: {} }) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

		await expect(
			persistSlackAcquisitionIfFirst({ source: 'slack', entry: 'mention' }, { fetch, aiServer: 'https://ai.example' })
		).resolves.toEqual({ wrote: true })

		expect(fetch).toHaveBeenNthCalledWith(1, 'https://ai.example/user-settings')
		expect(fetch).toHaveBeenNthCalledWith(2, 'https://ai.example/user-settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ settings: { signup_source: { source: 'slack', entry: 'mention' } } })
		})
	})

	it('skips persistence when signup source already exists', async () => {
		const fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ settings: { signup_source: { source: 'stripe' } } })
		})

		await expect(
			persistSlackAcquisitionIfFirst({ source: 'slack', entry: 'mention' }, { fetch, aiServer: 'https://ai.example' })
		).resolves.toEqual({ wrote: false })

		expect(fetch).toHaveBeenCalledTimes(1)
	})
})
