import { useRouter } from 'next/router'
import { SubscribeHome } from '~/containers/Subscribtion/Home'
import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { WalletProvider } from '~/layout/WalletProvider'
import { safeInternalPath } from '~/utils/url'

export default function Subscribe() {
	const router = useRouter()
	const returnUrl = safeInternalPath(router.query.returnUrl)
	const isTrial = router.query.trial === 'true'

	return (
		<WalletProvider>
			<SubscribeLayout>
				<SubscribeHome returnUrl={returnUrl} isTrial={isTrial} />
			</SubscribeLayout>
		</WalletProvider>
	)
}
