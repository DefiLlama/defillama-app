import * as React from 'react'
import Head from 'next/head'
import styled from 'styled-components'
import { transparentize } from 'polished'
import ThemeProvider, { GlobalStyle, ThemedBackground } from '~/Theme'
import SEO from '~/components/SEO'
import Nav from '~/components/Nav'

const Center = styled.main`
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 28px;
	max-width: 90rem;
	width: 100%;
	margin: 0 auto;
	padding: 0 32px 32px;
	color: ${({ theme }) => theme.text1};
`

const PageWrapper = styled.div`
	flex: 1;
	padding: 36px 0 80px;
	display: flex;
	flex-direction: column;
	background-color: ${({ theme }) => theme.onlyLight};
	isolation: isolate;

	@media screen and (max-width: 37.5rem) {
		& > * {
			padding: 0 12px;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		padding-left: 220px;
	}
`

interface ILayoutProps {
	title: string
	children: React.ReactNode
	defaultSEO?: boolean
	backgroundColor?: string
	style?: React.CSSProperties
}

interface IBackground {
	backgroundColor?: string
}

const Background = styled(ThemedBackground)<IBackground>``

export default function Layout({ title, children, defaultSEO = false, backgroundColor, ...props }: ILayoutProps) {
	return (
		<>
			<Head>
				<title>{title}</title>
			</Head>

			{defaultSEO && <SEO />}

			<ThemeProvider>
				<GlobalStyle />
				<Nav />
				<PageWrapper>
					<Background backgroundColor={backgroundColor || transparentize(0.8, '#445ed0')} />
					<Center {...props}>{children}</Center>
				</PageWrapper>
			</ThemeProvider>
		</>
	)
}
