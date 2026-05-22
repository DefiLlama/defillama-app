import type { ProjectTier } from './types'

export function getProjectTier(
	user: { flags?: Record<string, unknown> } | null | undefined,
	hasActiveSubscription: boolean,
	isTrial: boolean
): ProjectTier {
	if (user?.flags?.is_llama) return 'llama'
	if (hasActiveSubscription) return 'paid'
	if (isTrial) return 'trial'
	return 'free'
}
