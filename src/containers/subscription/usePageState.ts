import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'
import { useSubPageDev, type SubPageState } from './DevToolbar'
import type { BillingCycle, PlanKey } from './types'

export function useSubscriptionPageState(): SubPageState {
	const dev = useSubPageDev()
	const { isAuthenticated, isTrial } = useAuthContext()
	const { apiSubscription, llamafeedSubscription } = useSubscribe()

	if (dev) return dev

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

	return { isAuthenticated, currentPlan, isTrial, userBillingCycle }
}
