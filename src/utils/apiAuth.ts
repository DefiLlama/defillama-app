import { AUTH_SERVER, POCKETBASE_URL } from '~/constants'

type ValidationSuccess = { valid: true; isTrial: boolean }
type ValidationFailure = { valid: false; status: number; error: string }
export type ValidationResult = ValidationSuccess | ValidationFailure

export async function validateSubscription(authHeader: string | undefined): Promise<ValidationResult> {
	if (!authHeader?.startsWith('Bearer ')) {
		return { valid: false, status: 401, error: 'Authentication required' }
	}

	const subResponse = await fetch(`${AUTH_SERVER}/subscription/status`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: authHeader
		}
	})

	if (!subResponse.ok) {
		return { valid: false, status: 403, error: 'Invalid subscription' }
	}

	const subData = await subResponse.json()
	if (subData?.subscription?.status !== 'active') {
		return { valid: false, status: 403, error: 'Active subscription required' }
	}

	const isTrial = Boolean(subData?.subscription?.metadata?.isTrial)

	return { valid: true, isTrial }
}

export async function getTrialCsvDownloadCount(authHeader: string): Promise<number> {
	const response = await fetch(`${POCKETBASE_URL}/api/collections/users/auth-refresh`, {
		method: 'POST',
		headers: { Authorization: authHeader }
	})

	if (!response.ok) return 0

	const data = await response.json()
	const count = data?.record?.flags?.csvDownload
	return typeof count === 'number' ? count : 0
}

export async function trackCsvDownload(authHeader: string): Promise<void> {
	await fetch(`${AUTH_SERVER}/user/track-csv-download`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: authHeader
		}
	}).catch(() => {})
}
