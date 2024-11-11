import { ConnectButton } from '@rainbow-me/rainbowkit'

import Layout from '~/layout'
import ProApi from '~/containers/ProApi'
import { WalletConfig } from '~/layout/WalletConfig'

export default function ProApiPage() {
	return (
		<WalletConfig>
			<Layout title="DefiLlama - Pro API">
				<div className="flex flex-row-reverse">
					<ConnectButton />
				</div>
				<ProApi />
			</Layout>
		</WalletConfig>
	)
}
