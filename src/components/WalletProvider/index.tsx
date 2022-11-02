import '@rainbow-me/rainbowkit/styles.css'

import { darkTheme, getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { configureChains, createClient, WagmiConfig, chain } from 'wagmi'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import styled from 'styled-components'

const avax = {
	id: 43114,
	name: 'AVAX',
	network: 'avax',
	iconUrl: '/bnb.png',
	iconBackground: '#000',
	nativeCurrency: {
		decimals: 18,
		name: 'Avalanche',
		symbol: 'Avax'
	},
	rpcUrls: {
		default: 'https://avalanche-evm.publicnode.com'
	},
	blockExplorers: {
		default: { name: 'BscScan', url: 'https://bscscan.com' },
		etherscan: { name: 'BscScan', url: 'https://bscscan.com' }
	},
	testnet: false
}

const { provider, chains } = configureChains(
	[
		chain.arbitrum,
		avax,
		{
			...chain.mainnet,
			rpcUrls: {
				default: 'https://mainnet.infura.io/v3/e694851905e84405aa8de9d5b4705035'
			}
		},
		chain.optimism
	],
	[jsonRpcProvider({ rpc: (chain) => ({ http: chain.rpcUrls.default }) })]
)

const Provider = styled.div`
	width: 100%;
	& > div {
		width: 100%;
	}
`

const { connectors } = getDefaultWallets({
	appName: 'DefiLlama',
	chains
})

const wagmiClient = createClient({
	autoConnect: false,
	connectors,
	provider
})

export const WalletWrapper = ({ children }: { children: React.ReactNode }) => {
	return (
		<WagmiConfig client={wagmiClient}>
			<Provider>
				<RainbowKitProvider chains={chains} theme={darkTheme()}>
					{children}
				</RainbowKitProvider>
			</Provider>
		</WagmiConfig>
	)
}
