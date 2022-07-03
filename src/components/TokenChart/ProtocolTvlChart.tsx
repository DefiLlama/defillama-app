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

const McapTvlChart = dynamic(() => import('./McapTvlChart'), {
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

	const { data: denominationHistory } = useDenominationPriceHistory(
		DENOMINATIONS.find((d) => d.symbol === denomination)?.geckoId
	)

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

	const { finalChartData, moneySymbol } = React.useMemo(() => {
		const isValidDenomination =
			denomination && denomination !== 'USD' && DENOMINATIONS.find((d) => d.symbol === denomination)

		if (isValidDenomination && denominationHistory?.prices?.length > 0) {
			let priceIndex = 0
			let prevPriceDate = 0
			const denominationPrices = denominationHistory.prices
			const newChartData = []

			for (let i = 0; i < chartDataFiltered.length; i++) {
				const date = chartDataFiltered[i][0] * 1000
				while (
					priceIndex < denominationPrices.length &&
					Math.abs(date - prevPriceDate) > Math.abs(date - denominationPrices[priceIndex][0])
				) {
					prevPriceDate = denominationPrices[priceIndex][0]
					priceIndex++
				}
				const price = denominationPrices[priceIndex - 1][1]
				newChartData.push([chartDataFiltered[i][0], chartDataFiltered[i][1] / price])
			}

			let moneySymbol = '$'

			const d = DENOMINATIONS.find((d) => d.symbol === denomination)

			if (d.symbol === 'ETH') {
				moneySymbol = 'Ξ'
			} else moneySymbol = d.symbol.slice(0, 1)

			return { finalChartData: newChartData, moneySymbol }
		} else return { finalChartData: chartDataFiltered, moneySymbol: '$' }
	}, [denomination, denominationHistory, chartDataFiltered, DENOMINATIONS])

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

			<McapTvlChart
				chartData={finalChartData}
				geckoId={geckoId}
				color={color}
				title=""
				moneySymbol={moneySymbol}
				hallmarks={hallmarks}
			/>
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
