import { darkTheme, getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import type { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { mainnet, optimism } from 'wagmi/chains'

const config = getDefaultConfig({
	appName: 'DefiLlama',
	projectId: 'abcbcfd99b02bb0d7057fc19b2f8a2ad',
	chains: [optimism, mainnet],
	ssr: true
})

export const WalletProviderClient = ({ children }: { children: ReactNode }) => {
	return (
		<WagmiProvider config={config}>
			<RainbowKitProvider
				theme={darkTheme({
					fontStack: 'system',
					overlayBlur: 'small',
					borderRadius: 'medium'
				})}
			>
				{children}
			</RainbowKitProvider>
		</WagmiProvider>
	)
}
