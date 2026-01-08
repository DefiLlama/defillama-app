import { useRouter } from 'next/router'
import { SubscribeHome } from '~/containers/Subscribtion/Home'
import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { WalletProvider } from '~/layout/WalletProvider'
import { safeInternalPath } from '~/utils/url'

export default function Subscribe() {
	const router = useRouter()
	const returnUrl = safeInternalPath(router.query.returnUrl)

	return (
		<WalletProvider>
			<SubscribeLayout>
				<SubscribeHome returnUrl={returnUrl} />
			</SubscribeLayout>
		</WalletProvider>
	)
}
