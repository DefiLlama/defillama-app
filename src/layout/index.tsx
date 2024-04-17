import * as React from 'react'
import Head from 'next/head'
import styled from 'styled-components'
import { connectorsForWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { mainnet, optimism } from 'wagmi/chains'
import { rabbyWallet, injectedWallet, walletConnectWallet, metaMaskWallet } from '@rainbow-me/rainbowkit/wallets'
import { publicProvider } from 'wagmi/providers/public'
import '@rainbow-me/rainbowkit/styles.css'

import ThemeProvider, { GlobalStyle } from '~/Theme'
import SEO from '~/components/SEO'
import Nav from '~/components/Nav'

const PageWrapper = styled.div<{ fullWidth?: boolean }>`
	flex: 1;
	display: flex;
	flex-direction: column;
	margin: 16px;
	isolation: isolate;

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		margin: 28px 28px 28px 248px;
		width: ${({ fullWidth }) => fullWidth && 'calc(100vw - 258px);'};
	}
`

const Center = styled.main`
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 28px;
	width: 100%;
	max-width: 140rem;
	min-height: 100%;
	margin: 0 auto;
	color: ${({ theme }) => theme.text1};
`

interface ILayoutProps {
	title: string
	children: React.ReactNode
	defaultSEO?: boolean
	backgroundColor?: string
	style?: React.CSSProperties
	fullWidth?: boolean
}

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

export default function Layout({ title, children, defaultSEO = false, ...props }: ILayoutProps) {
	return (
		<>
			<Head>
				<title>{title}</title>
				<link rel="icon" type="image/png" href="/favicon-32x32.png" />
			</Head>

			{defaultSEO && <SEO />}

			<ThemeProvider>
				<GlobalStyle />
				<Nav />
				<PageWrapper {...props}>
					<WagmiConfig client={wagmiConfig}>
						<RainbowKitProvider chains={chains}>
							<Center {...props}>{children}</Center>
						</RainbowKitProvider>
					</WagmiConfig>
				</PageWrapper>
			</ThemeProvider>
		</>
	)
}
