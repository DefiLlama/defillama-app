import * as React from 'react'
import Head from 'next/head'
import styled from 'styled-components'
import { transparentize } from 'polished'
import ThemeProvider, { GlobalStyle, ThemedBackground } from '~/Theme'
import SEO from '~/components/SEO'
import Nav from '~/components/Nav'

const PageWrapper = styled.div`
	flex: 1;
	display: flex;
	flex-direction: column;
	margin: 16px;
	isolation: isolate;

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		margin: 28px 28px 28px 248px;
	}
`

const Center = styled.main`
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 28px;
	max-width: 86rem;
	width: 100%;
	margin: 0 auto;
	color: ${({ theme }) => theme.text1};
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
