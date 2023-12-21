import { QueryClient, QueryClientProvider } from 'react-query'
import { connectorsForWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { mainnet, optimism } from 'wagmi/chains'
import { rabbyWallet, injectedWallet, walletConnectWallet, metaMaskWallet } from '@rainbow-me/rainbowkit/wallets'
import { publicProvider } from 'wagmi/providers/public'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import styled from 'styled-components'

import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/chains'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainContainer } from '~/containers/ProContainer'

import '@rainbow-me/rainbowkit/styles.css'

const { chains, publicClient } = configureChains([mainnet, optimism], [publicProvider()])
const projectId = 'testtttt'

const connectors = connectorsForWallets([
	{
		groupName: 'Recommended',
		wallets: [
			injectedWallet({ chains }),
			metaMaskWallet({ chains, projectId }),
			walletConnectWallet({ projectId, chains }),
			rabbyWallet({ chains })
		]
	}
])
const wagmiConfig = createConfig({
	autoConnect: true,
	connectors,
	publicClient
})

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
		<WagmiConfig config={wagmiConfig}>
			<RainbowKitProvider chains={chains}>
				<QueryClientProvider client={queryClient}>
					<Layout style={{ gap: '8px' }} title="DefiLlama - DeFi Dashboard">
						<ButtonWrapper>
							<ConnectButton />
						</ButtonWrapper>
						<ChainContainer {...props} />
					</Layout>
				</QueryClientProvider>{' '}
			</RainbowKitProvider>
		</WagmiConfig>
	)
}
