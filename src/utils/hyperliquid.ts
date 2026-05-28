import { fetchWithPoolingOnServer } from './http-client'

export const HYPERLIQUID_INFO_API = 'https://api.hyperliquid.xyz/info'

export const HLP_VAULTS = {
	A: '0x010461c14e146ac35fe42271bdc1134ee31c703a',
	B: '0x31ca8395cf837de08b24da3f660e77761dfb974b'
} as const

export type HlpVaultKey = keyof typeof HLP_VAULTS

export function num(value: unknown, fallback = 0): number {
	const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
	return Number.isFinite(parsed) ? parsed : fallback
}

export function nullableNum(value: unknown): number | null {
	if (value == null || value === '') return null
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

export function annualizeFunding(rate: unknown, interval: 'hourly' | '8h' = '8h'): number | null {
	const parsed = nullableNum(rate)
	if (parsed == null) return null
	return interval === 'hourly' ? parsed * 24 * 365 * 100 : parsed * 3 * 365 * 100
}

export async function postInfo<T>(payload: Record<string, unknown>, timeout = 8000): Promise<T> {
	const response = await fetchWithPoolingOnServer(HYPERLIQUID_INFO_API, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
		timeout
	})

	if (!response.ok) {
		throw new Error(`Hyperliquid API ${response.status}`)
	}

	return response.json()
}

export async function safePostInfo<T>(payload: Record<string, unknown>, fallback: T, timeout = 8000): Promise<T> {
	try {
		return await postInfo<T>(payload, timeout)
	} catch {
		return fallback
	}
}

export function resolveWindowStart(window: string | undefined): number {
	const now = Date.now()
	if (window === '30d' || window === 'month') return now - 30 * 24 * 60 * 60 * 1000
	if (window === '7d' || window === 'week') return now - 7 * 24 * 60 * 60 * 1000
	if (window === '24h' || window === 'day') return now - 24 * 60 * 60 * 1000
	return now - 24 * 60 * 60 * 1000
}
