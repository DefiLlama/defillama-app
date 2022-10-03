import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Repeat, X } from 'react-feather'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { TYPE } from '~/Theme'
import Layout from '~/layout'
import { Panel } from '~/components'
import Column from '~/components/Column'
import { BasicLink } from '~/components/Link'
import Loader from '~/components/LocalLoader'
import { AutoRow, RowBetween } from '~/components/Row'
import TokenLogo from '~/components/TokenLogo'
import { ProtocolsChainsSearch } from '~/components/Search'
import { SETS } from '~/components/Search/types'
import { useMedia } from '~/hooks'
import { formattedNum, standardizeProtocolName } from '~/utils'
import { useFetchProtocol, useGeckoProtocol } from '~/api/categories/protocols/client'

const ComparisonDetailsLayout = styled.div`
	display: inline-grid;
	width: 100%;
	grid-template-columns: 33% 10% 33%;
	column-gap: 30px;
	align-items: center;
	justify-content: center;

	@media screen and (max-width: 1024px) {
		grid-template-columns: 1fr;
		align-items: center;
		justify-items: center;
		> * {
			grid-column: 1 / 4;
			margin-bottom: 1rem;
			display: table-row;
			> * {
				margin-bottom: 1rem;
			}
		}
	}
`

const Wrapper = styled.div`
	padding: 13px 16px;
	background: ${({ theme }) => theme.bg6};
	border-radius: 12px;
	outline: none;
	color: ${({ theme }) => theme.text1};
	font-size: 1rem;
	box-shadow: ${({ theme }) => theme.shadow};
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;

	& > * {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-weight: 500;
		font-size: 14px;
	}

	img {
		width: 20px !important;
		height: 20px !important;
	}
`

const CloseIcon = styled(X)`
	height: 20px;
	width: 20px;
	color: ${({ theme }) => theme.text3};
`

const ProtocolTitle = styled(TYPE.main)`
	text-align: center;
`

const TokenColoredText = styled.span`
	color: ${({ color }) => (color ? color : 'inherit')};
`

interface IPriceChange {
	priceChange?: number
}

const PriceChange = styled.span<IPriceChange>`
	color: ${({ priceChange, theme }) => (priceChange === 1 ? 'inherit' : priceChange > 1 ? theme.green1 : theme.red1)};
`

const SwapProtocolsIcon = styled(Repeat)`
	color: white;

	&:hover {
		transform: scale(1.15);
	}

	@media screen and (max-width: 1024px) {
		margin: 0;
	}
`

const PriceResultPanel = styled(Panel)`
	text-align: center;
	width: auto;
`

const protocolAColor = '#4f8fea'
const protocolBColor = '#fd3c99'
const backgroundColor = '#2172E5'

// assuming price is 0 is not valid
const validTokenData = (tokenData) => !!tokenData?.price && !!tokenData?.name

const useTokenInfoHook = (protocol, protocolsMcapTvl) => {
	// 0 price for unable to query gecko properly
	const [tokenPrice, setTokenPrice] = useState(0)
	// Ability to change currency in future?
	const [defaultCurrency] = useState('usd')
	const { data: tokenData, loading: protocolLoading } = useFetchProtocol(protocol)
	const geckoId = (tokenData && tokenData?.gecko_id) || undefined
	const { data: geckoData, loading: geckoLoading } = useGeckoProtocol(geckoId)
	const geckoPrice = (geckoData || {})?.[geckoId]?.[defaultCurrency]

	useEffect(() => {
		setTokenPrice(geckoPrice)
	}, [geckoPrice])

	return {
		...tokenData,
		tvl: protocolsMcapTvl[protocol]?.tvl,
		mcap: protocolsMcapTvl[protocol]?.mcap,
		price: tokenPrice,
		loading: protocolLoading || geckoLoading
	}
}

const DisplayToken = ({ tokenSymbol, logo, address, price, resetDisplay }) => (
	<Wrapper>
		<p>
			<TokenLogo address={address} logo={logo} size={24} />
			<span>{tokenSymbol}</span>
			<span>{formattedNum(price, true)}</span>
		</p>
		<button onClick={resetDisplay}>
			<CloseIcon />
		</button>
	</Wrapper>
)

const removeSymbolFromName = (nameWithSymbol) => nameWithSymbol?.split(' (')[0] ?? ''

const TokenComparisonSearch = ({ protocolAorB, tokenValid, tokenSymbol, logo, address, price }) => {
	const router = useRouter()

	const { protocolA, protocolB } = router.query

	const linkPath = (protocolAorB) => (clickedProtocol) => {
		return `/comparison?protocolA=${standardizeProtocolName(
			removeSymbolFromName(protocolAorB === 'A' ? clickedProtocol : protocolA)
		)}&protocolB=${standardizeProtocolName(removeSymbolFromName(protocolAorB === 'B' ? clickedProtocol : protocolB))}`
	}

	const resetToken = (protocolAorB) => () => {
		const path = `/comparison?protocolA=${standardizeProtocolName(
			removeSymbolFromName(protocolAorB === 'A' ? '' : protocolA)
		)}&protocolB=${standardizeProtocolName(removeSymbolFromName(protocolAorB === 'B' ? '' : protocolB))}`

		router.push(path, undefined, { shallow: true })
	}

	return (
		<Column>
			<ProtocolTitle mb="1rem">
				<TokenColoredText color={protocolAorB === 'A' ? protocolAColor : protocolBColor}>
					Protocol {protocolAorB}
				</TokenColoredText>
			</ProtocolTitle>
			{tokenValid ? (
				<DisplayToken
					tokenSymbol={tokenSymbol}
					logo={logo}
					address={address}
					price={price}
					resetDisplay={resetToken(protocolAorB)}
				/>
			) : (
				<ProtocolsChainsSearch includedSets={[SETS.PROTOCOLS]} customPath={linkPath(protocolAorB)} />
			)}
		</Column>
	)
}

function ComparisonPage(props) {
	const { title, protocolsMcapTvl } = props

	const router = useRouter()

	const { protocolA, protocolB } = router.query

	const below400 = useMedia('(max-width: 400px)')
	const below1024 = useMedia('(max-width: 1024px)')
	const LENGTH = below1024 ? 10 : 16

	const tokenAData = useTokenInfoHook(protocolA, protocolsMcapTvl)

	const {
		address: tokenAAddress,
		logo: tokenALogo,
		symbol: tokenASymbol,
		price: tokenAPrice,
		mcap: tokenAMcap,
		tvl: tokenATvl,
		loading: loadingA
	} = tokenAData
	const tokenBData = useTokenInfoHook(protocolB, protocolsMcapTvl)
	const {
		address: tokenBAddress,
		logo: tokenBLogo,
		symbol: tokenBSymbol,
		price: tokenBPrice,
		mcap: tokenBMcap,
		tvl: tokenBTvl,
		loading: loadingB
	} = tokenBData

	const tokenBMcapTvl = tokenBMcap / tokenBTvl
	const tokenACirculating = tokenAMcap / tokenAPrice
	const tokenAPriceWithTokenBMcapTvl = (tokenBMcapTvl * tokenATvl) / tokenACirculating
	const tokenAPriceChange = tokenAPriceWithTokenBMcapTvl / tokenAPrice

	// format for long symbol
	const tokenAFormattedSymbol = tokenASymbol?.length > LENGTH ? tokenASymbol.slice(0, LENGTH) + '...' : tokenASymbol
	const tokenBFormattedSymbol = tokenBSymbol?.length > LENGTH ? tokenBSymbol.slice(0, LENGTH) + '...' : tokenBSymbol

	const tokenAValid = validTokenData(tokenAData)
	const tokenBValid = validTokenData(tokenBData)

	const handleSwapLinkPath = () => {
		const comparisonRoute = '/comparison'
		// If doesn't have two protocols stay on same page
		if (!tokenAValid || !tokenBValid) return comparisonRoute

		return `${comparisonRoute}?protocolA=${protocolB || ''}&protocolB=${protocolA || ''}`
	}

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)}>
			<RowBetween>
				<TYPE.largeHeader fontSize={below400 ? 16 : 24} style={{ width: '100%', textAlign: 'center' }}>
					Calculate the price of <TokenColoredText color={protocolAColor}>Protocol A</TokenColoredText>
					<br />
					with the Mcap/TVL of <TokenColoredText color={protocolBColor}>Protocol B</TokenColoredText>
				</TYPE.largeHeader>
			</RowBetween>
			<RowBetween style={{ flexWrap: 'wrap', alingItems: 'start' }}>
				<ComparisonDetailsLayout>
					<TokenComparisonSearch
						protocolAorB="A"
						tokenValid={tokenAValid}
						tokenSymbol={tokenAFormattedSymbol}
						logo={tokenALogo}
						address={tokenAAddress}
						price={tokenAPrice}
					/>

					<BasicLink style={{ margin: '2rem auto 0' }} href={handleSwapLinkPath()}>
						<SwapProtocolsIcon onClick={handleSwapLinkPath} />
					</BasicLink>

					<TokenComparisonSearch
						protocolAorB="B"
						tokenValid={tokenBValid}
						tokenSymbol={tokenBFormattedSymbol}
						logo={tokenBLogo}
						address={tokenBAddress}
						price={tokenBPrice}
					/>
				</ComparisonDetailsLayout>
			</RowBetween>
			{(loadingA || loadingB) && (
				<AutoRow style={{ gap: '1rem', justifyContent: 'center' }}>
					<Loader style={{ width: 'fit-content' }} />
				</AutoRow>
			)}
			{tokenAValid && tokenBValid && (
				<PriceResultPanel>
					<Column style={{ gap: '1rem' }}>
						<TYPE.main>
							{tokenAFormattedSymbol} price with the Mcap/TVL of {tokenBFormattedSymbol}
						</TYPE.main>
						<AutoRow style={{ justifyContent: 'center', gap: '7.5px' }}>
							<TokenLogo address={tokenAAddress} logo={tokenALogo} size={32} style={{ alignSelf: 'center' }} />
							<TYPE.largeHeader fontSize={32}>{formattedNum(tokenAPriceWithTokenBMcapTvl, true)}</TYPE.largeHeader>
							<TYPE.main style={{ marginTop: '7.5px' }}>
								<PriceChange priceChange={tokenAPriceChange}>({formattedNum(tokenAPriceChange)}x)</PriceChange>
							</TYPE.main>
						</AutoRow>
					</Column>
				</PriceResultPanel>
			)}
		</Layout>
	)
}

export default ComparisonPage
