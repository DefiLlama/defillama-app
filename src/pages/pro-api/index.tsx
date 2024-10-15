import { ConnectButton } from '@rainbow-me/rainbowkit'
import styled from 'styled-components'

import Layout from '~/layout'
import ProApi from '~/containers/ProApi'
import { WalletConfig } from '~/layout/WalletConfig'

const ButtonWrapper = styled.div`
	display: flex;
	flex-direction: row-reverse;
`

export default function ProApiPage() {
	return (
		<WalletConfig>
			<Layout style={{ gap: '8px' }} title="DefiLlama - Pro API" fullWidth>
				<ButtonWrapper>
					<ConnectButton />
				</ButtonWrapper>
				<ProApi />
			</Layout>
		</WalletConfig>
	)
}
