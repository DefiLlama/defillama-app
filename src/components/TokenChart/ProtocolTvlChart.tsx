import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { useDenominationPriceHistory } from '~/utils/dataApi'
import { useGetExtraTvlEnabled } from '~/contexts/LocalStorage'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import { IProtocolMcapTVLChartProps } from './types'

const AreaChart = dynamic(() => import('./AreaChart'), {
	ssr: false
}) as React.FC<IProtocolMcapTVLChartProps>

interface IProps {
	protocol: string
	tvlChartData: any
	color: string
	historicalChainTvls: {}
	chains: string[]
	bobo?: boolean
	hallmarks?: [number, string][]
	geckoId?: string
}

export default function ProtocolTvlChart({
	protocol,
	tvlChartData,
	color,
	historicalChainTvls,
	chains = [],
	bobo = false,
	hallmarks,
	geckoId
}: IProps) {
	const router = useRouter()

	const extraTvlEnabled = useGetExtraTvlEnabled()

	const { denomination } = router.query

	const DENOMINATIONS = React.useMemo(() => {
		let d = [{ symbol: 'USD', geckoId: null }]

		if (chains.length > 0) {
			if (chainCoingeckoIds[chains[0]]?.geckoId) {
				d.push(chainCoingeckoIds[chains[0]])
			} else {
				d.push(chainCoingeckoIds['Ethereum'])
			}
		}

		return d
	}, [chains])

	// fetch denomination on protocol chains
	const { data: denominationHistory, loading: denominationLoading } = useDenominationPriceHistory(
		DENOMINATIONS.find((d) => d.symbol === denomination)?.geckoId
	)

	// fetch protocol mcap data
	const { data: protocolCGData, loading } = useDenominationPriceHistory(geckoId)

	// update tvl calc based on extra tvl options like staking, pool2 selected
	const chartDataFiltered = React.useMemo(() => {
		const sections = Object.keys(historicalChainTvls).filter((sect) => extraTvlEnabled[sect.toLowerCase()])

		const tvlDictionary = {}
		if (sections.length > 0) {
			for (const name of sections) {
				tvlDictionary[name] = {}
				historicalChainTvls[name].tvl.forEach((dataPoint) => {
					tvlDictionary[name][dataPoint.date] = dataPoint.totalLiquidityUSD
				})
			}
			return tvlChartData?.map((item) => {
				const sum = sections.reduce((total, sect) => total + (tvlDictionary[sect]?.[item[0]] ?? 0), item[1])
				return [item[0], sum]
			})
		} else return tvlChartData
	}, [historicalChainTvls, extraTvlEnabled, tvlChartData])

	// calc y-axis based on denomination
	const { tvlData, moneySymbol } = React.useMemo(() => {
		const isValidDenomination =
			denomination && denomination !== 'USD' && DENOMINATIONS.find((d) => d.symbol === denomination)

		if (isValidDenomination && denominationHistory?.prices?.length > 0) {
			const newChartData = []

			chartDataFiltered.forEach(([date, tvl]) => {
				const priceAtDate = denominationHistory.prices.find(
					(x) => -432000000 < x[0] - date * 1000 && x[0] - date * 1000 < 432000000
				)

				if (priceAtDate) {
					newChartData.push([date, tvl / priceAtDate[1]])
				}
			})

			let moneySymbol = '$'

			const d = DENOMINATIONS.find((d) => d.symbol === denomination)

			if (d.symbol === 'ETH') {
				moneySymbol = 'Ξ'
			} else moneySymbol = d.symbol.slice(0, 1)

			return { tvlData: newChartData, moneySymbol }
		} else return { tvlData: chartDataFiltered, moneySymbol: '$' }
	}, [denomination, denominationHistory, chartDataFiltered, DENOMINATIONS])

	// append mcap data when api return it
	const { finalData, tokensUnique } = React.useMemo(() => {
		let chartData = []
		let tokensUnique = ['TVL']

		const isValid =
			protocolCGData &&
			!loading &&
			protocolCGData['market_caps'] &&
			protocolCGData['market_caps'].filter((x) => x[1] !== 0)?.length > 0

		if (isValid && (!denomination || denomination === 'USD')) {
			tokensUnique = ['TVL', 'Mcap']

			tvlData.forEach(([date, tvl]) => {
				const mcapAtDate = protocolCGData['market_caps'].find(
					(x) => -432000000 < x[0] - date * 1000 && x[0] - date * 1000 < 432000000
				)

				chartData.push({ date, TVL: tvl, Mcap: mcapAtDate ? mcapAtDate[1] : 0 })
			})
		} else {
			chartData = tvlData.map(([date, TVL]) => ({ date, TVL }))
		}

		return { finalData: chartData, tokensUnique }
	}, [tvlData, protocolCGData, loading, denomination])

	return (
		<Wrapper
			style={{
				...(bobo && {
					backgroundImage: 'url("/bobo.png")',
					backgroundSize: '100% 360px',
					backgroundRepeat: 'no-repeat',
					backgroundPosition: 'bottom'
				})
			}}
		>
			<FiltersWrapper>
				<Filters color={color}>
					{DENOMINATIONS.map((D) => (
						<Link href={`/protocol/${protocol}?denomination=${D.symbol}`} key={D.symbol} shallow passHref>
							<Denomination active={denomination === D.symbol || (D.symbol === 'USD' && !denomination)}>
								{D.symbol}
							</Denomination>
						</Link>
					))}
				</Filters>
			</FiltersWrapper>

			{!loading && !denominationLoading && (
				<AreaChart
					chartData={finalData}
					geckoId={geckoId}
					color={color}
					title=""
					moneySymbol={moneySymbol}
					tokensUnique={tokensUnique}
					hideLegend={true}
					hallmarks={hallmarks}
				/>
			)}
		</Wrapper>
	)
}

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 0 0 20px 0;
	min-height: 460px;
	grid-column: span 1;
`

const Filters = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 6px;
	background-color: ${({ color }) => transparentize(0.8, color)};
	border-radius: 12px;
	width: min-content;
`

const FiltersWrapper = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 16px;
	margin: 16px 16px 0;
`

interface IDenomination {
	active?: boolean
}

const Denomination = styled.a<IDenomination>`
	display: inline-block;
	font-weight: 500;
	font-size: 0.875rem;
	border-radius: 10px;
	background: ${({ theme, active }) =>
		active ? transparentize(0.5, theme.mode === 'dark' ? '#000' : '#fff') : 'none'};
	padding: 6px 8px;
	color: ${({ theme, active }) =>
		active
			? theme.mode === 'dark'
				? '#fff'
				: '#000'
			: theme.mode === 'dark'
			? 'rgba(255, 255, 255, 0.6)'
			: 'rgba(0, 0, 0, 0.6)'};
`
