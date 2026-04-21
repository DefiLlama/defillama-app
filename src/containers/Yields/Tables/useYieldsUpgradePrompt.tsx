import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useCallback, useState } from 'react'
import { setSignupSource } from '~/containers/Subscription/signupSource'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((module) => ({ default: module.SubscribeProModal }))
)

export function useYieldsUpgradePrompt() {
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })

	const onRequestUpgrade = useCallback((source: 'header' | 'cell') => {
		trackYieldsEvent(YIELDS_EVENTS.YIELD_SCORE_CLICK, { source })
		setSignupSource('yield-score')
		setShouldRenderModal(true)
	}, [])

	return {
		onRequestUpgrade,
		modal: shouldRenderModal ? (
			<Suspense fallback={null}>
				<SubscribeProModal dialogStore={subscribeModalStore} />
			</Suspense>
		) : null
	}
}
