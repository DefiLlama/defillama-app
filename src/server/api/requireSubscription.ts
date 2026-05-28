import type { NextApiResponse } from 'next'
import { validateSubscription, type ValidationResult } from '~/utils/apiAuth'

export type SubscriptionAuth = Extract<ValidationResult, { valid: true }>

export async function requireSubscription(
	authHeader: string | undefined,
	res: NextApiResponse
): Promise<SubscriptionAuth | null> {
	const auth = await validateSubscription(authHeader)
	if (auth.valid === false) {
		res.status(auth.status).json({ error: auth.error })
		return null
	}

	return auth
}
