import * as React from 'react'
import Head from 'next/head'
import styled from 'styled-components'
import ThemeProvider, { GlobalStyle } from '~/Theme'
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
	width: 100%;
	max-width: 86rem;
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
}

export default function Layout({ title, children, defaultSEO = false, ...props }: ILayoutProps) {
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
					<Center {...props}>{children}</Center>
				</PageWrapper>
			</ThemeProvider>
		</>
	)
}
