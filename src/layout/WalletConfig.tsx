import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { connectorsForWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { mainnet, optimism } from 'wagmi/chains'
import { rabbyWallet, injectedWallet, walletConnectWallet, metaMaskWallet } from '@rainbow-me/rainbowkit/wallets'
import { publicProvider } from 'wagmi/providers/public'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const { chains, provider } = configureChains([mainnet, optimism], [publicProvider()])
const projectId = 'abcbcfd99b02bb0d7057fc19b2f8a2ad'

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
const wagmiConfig = createClient({
	autoConnect: true,
	connectors,
	provider
})

export const WalletConfig = ({ children }: { children: ReactNode }) => {
	return (
		<QueryClientProvider client={queryClient}>
			<WagmiConfig client={wagmiConfig}>
				<RainbowKitProvider chains={chains}>{children}</RainbowKitProvider>
			</WagmiConfig>
		</QueryClientProvider>
	)
}
