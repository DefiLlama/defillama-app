export const RECOVERY_GRACE_MS = 20000
export const RECOVERY_ATTEMPT_DELAYS_MS = [0, 1000, 2000, 4000, 8000, 14000] as const

export const CONNECTIVITY_ERROR_PATTERNS = [
	'failed to fetch',
	'networkerror',
	'network error',
	'load failed',
	'err_network_changed',
	'network changed',
	'err_name_not_resolved',
	'name not resolved',
	'stream heartbeat timeout',
	'stream ended without done event',
	'http error status: 502',
	'http error status: 503',
	'http error status: 504',
	'bad gateway',
	'service unavailable',
	'gateway timeout'
] as const

export function getRecoveryErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	return String(error)
}

export function isTemporaryConnectivityError(error: unknown): boolean {
	if (typeof navigator !== 'undefined' && navigator.onLine === false) {
		return true
	}

	const message = getRecoveryErrorMessage(error).toLowerCase()
	return CONNECTIVITY_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}
