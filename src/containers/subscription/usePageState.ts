import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { useSubPageDev, type SubPageState } from './DevToolbar'
import type { BillingCycle, PlanKey } from './types'

export function useSubscriptionPageState(): SubPageState {
	const dev = useSubPageDev()
	const { isAuthenticated, isTrial, loaders } = useAuthContext()
	const { apiSubscription, llamafeedSubscription, isSubscriptionLoading, subscription } = useSubscribe()

	if (dev) return dev

	const isLoading = loaders.userLoading || (isAuthenticated && (isSubscriptionLoading || !subscription))

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
