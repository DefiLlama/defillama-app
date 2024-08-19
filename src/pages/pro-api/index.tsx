import { QueryClient, QueryClientProvider } from 'react-query'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import styled from 'styled-components'

import Layout from '~/layout'
import ProApi from '~/containers/ProApi'

const queryClient = new QueryClient()

const ButtonWrapper = styled.div`
	display: flex;
	flex-direction: row-reverse;
`

export default function ProApiPage() {
	return (
		<Layout style={{ gap: '8px' }} title="DefiLlama - Pro API" fullWidth>
			<QueryClientProvider client={queryClient}>
				<ButtonWrapper>
					<ConnectButton />
				</ButtonWrapper>
				<ProApi />
			</QueryClientProvider>
		</Layout>
	)
}
