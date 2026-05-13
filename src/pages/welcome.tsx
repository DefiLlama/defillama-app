import { SubscribeLayout } from '~/containers/Subscription/Layout'
import { WelcomeOnboarding } from '~/containers/Subscription/WelcomeOnboarding'
import { LazyWalletProvider as WalletProvider } from '~/layout/LazyWalletProvider'

export default function Welcome() {
	return (
		<WalletProvider>
			<SubscribeLayout title="Welcome to Pro - DefiLlama" description="Set up your DefiLlama Pro experience.">
				<WelcomeOnboarding />
			</SubscribeLayout>
		</WalletProvider>
	)
}
