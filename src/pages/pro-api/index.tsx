import { QueryClient, QueryClientProvider } from 'react-query'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import styled from 'styled-components'
import { Toaster } from 'react-hot-toast'

import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import ProApi from '~/containers/ProApi'

const queryClient = new QueryClient()

export const getStaticProps = withPerformanceLogging('index/pro', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

const ButtonWrapper = styled.div`
	display: flex;
	flex-direction: row-reverse;
`

export default function HomePage(props) {
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
