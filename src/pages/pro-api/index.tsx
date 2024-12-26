import { ConnectButton } from '@rainbow-me/rainbowkit'

import Layout from '~/layout'
import ProApi from '~/containers/ProApi'
import { WalletProvider } from '~/layout/WalletProvider'

export default function ProApiPage() {
	return (
		<WalletProvider>
			<Layout title="DefiLlama - Pro API">
				<div className="flex flex-row-reverse">
					<ConnectButton />
				</div>
				<ProApi />
			</Layout>
		</WalletProvider>
	)
}
