import { useAuthContext } from '~/containers/Subscription/auth'
import { useSubscribe } from '~/containers/Subscription/useSubscribe'
import { useIsClient } from '~/hooks/useIsClient'
import type { BillingCycle, PlanKey } from './types'

interface PageState {
	isAuthenticated: boolean
	currentPlan: PlanKey | null
	isTrial: boolean
	userBillingCycle: BillingCycle | null
	isLoading?: boolean
}

export function useSubscriptionPageState(): PageState {
	const isClient = useIsClient()
	const { isAuthenticated, isTrial, loaders } = useAuthContext()
	const { apiSubscription, llamafeedSubscription, isSubscriptionLoading, subscription } = useSubscribe()

	const isLoading = isClient && (loaders.userLoading || (isAuthenticated && (isSubscriptionLoading || !subscription)))

	let currentPlan: PlanKey | null = null
	let userBillingCycle: BillingCycle | null = null

	if (isAuthenticated) {
		if (apiSubscription?.status === 'active') {
			currentPlan = 'api'
			userBillingCycle = apiSubscription.billing_interval === 'year' ? 'yearly' : 'monthly'
		} else if (llamafeedSubscription?.status === 'active') {
			currentPlan = 'pro'
			userBillingCycle = llamafeedSubscription.billing_interval === 'year' ? 'yearly' : 'monthly'
		} else {
			currentPlan = 'free'
		}
	}

	return { isAuthenticated, currentPlan, isTrial, userBillingCycle, isLoading }
}
