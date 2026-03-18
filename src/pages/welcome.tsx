import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { WelcomeOnboarding } from '~/containers/Subscribtion/WelcomeOnboarding'
import { WalletProvider } from '~/layout/WalletProvider'

export default function Welcome() {
	return (
		<WalletProvider>
			<SubscribeLayout
				title="Welcome to Pro - DefiLlama"
				description="Set up your DefiLlama Pro experience."
			>
				<WelcomeOnboarding />
			</SubscribeLayout>
		</WalletProvider>
	)
}
