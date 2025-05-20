import '@rainbow-me/rainbowkit/styles.css'
import { darkTheme, getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { optimism } from 'wagmi/chains'
import { ReactNode } from 'react'

export const config = getDefaultConfig({
	appName: 'DefiLlama',
	projectId: 'abcbcfd99b02bb0d7057fc19b2f8a2ad',
	chains: [optimism]
})

export const WalletProvider = ({ children }: { children: ReactNode }) => {
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
