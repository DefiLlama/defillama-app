import { QueryClient, QueryClientProvider } from 'react-query'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import styled from 'styled-components'

import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/chains'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainContainer } from '~/containers/ProContainer'

export const getStaticProps = withPerformanceLogging('index/pro', async () => {
	const data = await getChainPageData()

	return {
		props: {
			...data.props,
			totalFundingAmount: data.props.raisesChart
				? Object.values(data.props.raisesChart).reduce((acc, curr) => (acc += curr), 0) * 1e6
				: null
		},
		revalidate: maxAgeForNext([22])
	}
})

const ButtonWrapper = styled.div`
	display: flex;
	flex-direction: row-reverse;
`

const queryClient = new QueryClient()
export default function HomePage(props) {
	return (
		<QueryClientProvider client={queryClient}>
			<Layout style={{ gap: '8px' }} title="DefiLlama - DeFi Dashboard" fullWidth>
				<ButtonWrapper>
					<ConnectButton />
				</ButtonWrapper>
				<ChainContainer {...props} />
			</Layout>
		</QueryClientProvider>
	)
}
