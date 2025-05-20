import { SubscribeHome } from '~/containers/Subscribtion/Home'
import { SubscribeLayout } from '~/containers/Subscribtion/Layout'
import { WalletProvider } from '~/layout/WalletProvider'

export default function Subscribe() {
	return (
		<WalletProvider>
			<SubscribeLayout>
				<SubscribeHome />
			</SubscribeLayout>
		</WalletProvider>
	)
}
