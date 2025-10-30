import { useRouter } from 'next/router'
import { UserAccountPage } from '~/containers/Subscribtion/UserAccountPage'
import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { WalletProvider } from '~/layout/WalletProvider'

export default function User() {
	const router = useRouter()
	const returnUrl = router.query.returnUrl as string | undefined

	return (
		<WalletProvider>
			<SubscribeLayout>
				<UserAccountPage returnUrl={returnUrl} />
			</SubscribeLayout>
		</WalletProvider>
	)
}

