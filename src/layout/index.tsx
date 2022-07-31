import * as React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { transparentize } from 'polished'
import loaderImg from '~/public/defillama-press-kit/nft/PNG/defillama_211230_brand_logo_defillama-nft-icon.png'
import ThemeProvider, { GlobalStyle, ThemedBackground } from '~/Theme'
import SEO from '~/components/SEO'
import Nav from '~/components/Nav'

const Center = styled.main`
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
	padding: 36px 0 80px;
	flex: 1;
	z-index: 0;
	transition: width 0.25s ease;
	background-color: ${({ theme }) => theme.onlyLight};

	@media screen and (max-width: 37.5rem) {
		& > * {
			padding: 0 12px;
		}
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		padding-left: 220px;
	}
`

const LoaderBody = styled.div`
	margin: 0 auto;
	margin-top: 35vh;
	width: fit-content;
`

const LoaderText = styled.div`
	margin-top: 8px;
	font-size: 20px;
	font-weight: 500;
	text-align: center;
	padding-left: 8px;
`

const Loader = styled.img`
	width: 120px;
	height: 120px;
	-webkit-animation: spin 3s linear infinite;
	-moz-animation: spin 3s linear infinite;
	animation: spin 3s linear infinite;
	@-moz-keyframes spin {
		100% {
			-moz-transform: rotate(360deg);
		}
	}
	@-webkit-keyframes spin {
		100% {
			-webkit-transform: rotate(360deg);
		}
	}
	@keyframes spin {
		100% {
			-webkit-transform: rotate(360deg);
			transform: rotate(360deg);
		}
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
	const router = useRouter()
	const [pageLoading, setPageLoading] = React.useState<boolean>(false)
	React.useEffect(() => {
		const handleStart = () => {
			setPageLoading(true)
		}
		const handleComplete = () => {
			setPageLoading(false)
		}

		router.events.on('routeChangeStart', handleStart)
		router.events.on('routeChangeComplete', handleComplete)
		router.events.on('routeChangeError', handleComplete)
	}, [router])

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
					{pageLoading ? (
						<LoaderBody>
							<Loader src={loaderImg.src} />
							<LoaderText>Loading...</LoaderText>
						</LoaderBody>
					) : (
						<Center {...props}>{children}</Center>
					)}
				</PageWrapper>
			</ThemeProvider>
		</>
	)
}
