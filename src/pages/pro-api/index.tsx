import { QueryClient, QueryClientProvider } from 'react-query'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import styled from 'styled-components'
import { Toaster } from 'react-hot-toast'

import Layout from '~/layout'
import ProApi from '~/containers/ProApi'
import { IS_PRO_API_ENABLED } from '~/containers/ProApi/lib/constants'

const queryClient = new QueryClient()

const ButtonWrapper = styled.div`
	display: flex;
	flex-direction: row-reverse;
`

export default function ProApiPage() {
	if (!IS_PRO_API_ENABLED) {
		return null
	}
	return (
		<Layout style={{ gap: '8px' }} title="DefiLlama - Pro API" fullWidth>
			<Toaster />
			<QueryClientProvider client={queryClient}>
				<ButtonWrapper>
					<ConnectButton />
				</ButtonWrapper>
				<ProApi />
			</QueryClientProvider>
		</Layout>
	)
}
