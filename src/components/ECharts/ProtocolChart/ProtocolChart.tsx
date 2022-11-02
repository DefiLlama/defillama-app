import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { useDenominationPriceHistory } from '~/api/categories/protocols/client'
import { useDefiManager } from '~/contexts/LocalStorage'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import type { IChartProps } from '../types'

const AreaChart = dynamic(() => import('./index'), {
	ssr: false
}) as React.FC<IChartProps>

interface IProps {
	protocol: string
	tvlChartData: any
	color: string
	historicalChainTvls: {}
	chains: string[]
	volumeMap: Record<number, number>
	bobo?: boolean
	hallmarks?: [number, string][]
	geckoId?: string | null
}

const chartColors = {
	Volume: '#4f8fea',
	TVL: '#E59421',
	Mcap: '#8eb027'
}

export default function ProtocolChart({
	protocol,
	tvlChartData,
	color,
	historicalChainTvls,
	chains = [],
	bobo = false,
	hallmarks,
	geckoId,
	volumeMap
}: IProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useDefiManager()

	const { denomination, showMcapChart, hideEvents, showVolume } = router.query

	const showMcap = showMcapChart === 'true'
	const hideHallmarks = hideEvents === 'true'
	const showVol = showVolume === 'true'

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
		return formatProtocolsTvlChartData({ historicalChainTvls, extraTvlEnabled, tvlChartData })
	}, [historicalChainTvls, extraTvlEnabled, tvlChartData])

	// calc y-axis based on denomination
	const { tvlData, valueSymbol } = React.useMemo(() => {
		const isValidDenomination =
			denomination && denomination !== 'USD' && DENOMINATIONS.find((d) => d.symbol === denomination)

		if (isValidDenomination && denominationHistory?.prices?.length > 0) {
			const newChartData = []

			chartDataFiltered.forEach(([date, tvl]) => {
				let priceAtDate = denominationHistory.prices.find((x) => x[0] === date * 1000)

				if (!priceAtDate) {
					priceAtDate = denominationHistory.prices.find(
						(x) => -432000000 < x[0] - date * 1000 && x[0] - date * 1000 < 432000000
					)
				}

				if (priceAtDate) {
					newChartData.push([date, tvl / priceAtDate[1]])
				}
			})

			let valueSymbol = '$'

			const d = DENOMINATIONS.find((d) => d.symbol === denomination)

			if (d.symbol === 'ETH') {
				valueSymbol = 'Ξ'
			} else valueSymbol = d.symbol.slice(0, 1)

			return { tvlData: newChartData, valueSymbol }
		} else return { tvlData: chartDataFiltered, valueSymbol: '$' }
	}, [denomination, denominationHistory, chartDataFiltered, DENOMINATIONS])

	const protocolHasMcap =
		protocolCGData &&
		!loading &&
		protocolCGData['market_caps'] &&
		protocolCGData['market_caps'].filter((x) => x[1] !== 0)?.length > 0 &&
		(!denomination || denomination === 'USD')

	// append mcap data when api return it
	const { finalData, tokensUnique } = React.useMemo(() => {
		let chartData = []
		let tokensUnique = ['TVL']

		if (protocolHasMcap && showMcap) {
			tokensUnique = ['TVL', 'Mcap']

			tvlData.forEach(([date, tvl]) => {
				let mcapAtDate = protocolCGData['market_caps'].find((x) => x[0] === date * 1000)

				if (!mcapAtDate) {
					mcapAtDate = protocolCGData['market_caps'].find(
						(x) => -432000000 < x[0] - date * 1000 && x[0] - date * 1000 < 432000000
					)
				}

				chartData.push({
					date,
					TVL: tvl,
					Mcap: mcapAtDate ? mcapAtDate[1] : '-',
					Volume: volumeMap && volumeMap[date]
				})
			})
		} else {
			chartData = tvlData.map(([date, TVL]) => ({
				date,
				TVL,
				Volume: volumeMap && volumeMap[date]
			}))
		}

		tokensUnique = tokensUnique.concat(showVol ? ['Volume'] : [])

		return { finalData: chartData, tokensUnique }
	}, [tvlData, protocolCGData, showMcap, protocolHasMcap, showVol])

	const toggleFilter = React.useCallback(
		(type: string) => {
			const param = { [type]: !(router.query[type] === 'true') }

			router.push(
				{
					pathname: router.pathname,
					query: {
						...router.query,
						...param
					}
				},
				undefined,
				{ shallow: true }
			)
		},
		[router]
	)

	return (
		<Wrapper>
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
				{Object.values(volumeMap || {}).length > 0 && (
					<ToggleCharts>
						<input
							type="checkbox"
							value="showVolume"
							checked={router.query.showVolume === 'true'}
							onChange={() => toggleFilter('showVolume')}
						/>
						<span>Show Volume</span>
					</ToggleCharts>
				)}

				{hallmarks?.length > 0 && (
					<ToggleCharts>
						<input
							type="checkbox"
							value="hideEvents"
							checked={hideHallmarks}
							onChange={() => toggleFilter('hideEvents')}
						/>
						<span>Hide Events</span>
					</ToggleCharts>
				)}

				{protocolHasMcap && (
					<ToggleCharts>
						<input
							type="checkbox"
							value="showMcapChart"
							checked={showMcap}
							onChange={() => toggleFilter('showMcapChart')}
						/>
						<span>Show MCap Chart</span>
					</ToggleCharts>
				)}
			</FiltersWrapper>

			{!loading && !denominationLoading && (
				<AreaChart
					chartData={finalData}
					color={color}
					title=""
					valueSymbol={valueSymbol}
					stacks={tokensUnique}
					hidedefaultlegend={true}
					hallmarks={!hideHallmarks && hallmarks}
					tooltipSort={false}
					stackColors={chartColors}
					style={{
						...(bobo && {
							backgroundImage: 'url("/bobo.png")',
							backgroundSize: '100% 360px',
							backgroundRepeat: 'no-repeat',
							backgroundPosition: 'bottom'
						})
					}}
				/>
			)}
		</Wrapper>
	)
}

export const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 0 0 20px 0;
	min-height: 460px;
	grid-column: span 1;
`

export const FiltersWrapper = styled.div`
	display: flex;
	flex-direction: column;
	flex-wrap: wrap;
	gap: 16px;
	margin: 16px 16px 0;

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		flex-wrap: wrap;
		flex-direction: row;
		align-items: center;
	}
`

export const Filters = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 6px;
	background-color: ${({ color }) => transparentize(0.8, color)};
	border-radius: 12px;
	width: min-content;
`

export const ToggleCharts = styled.label`
	display: flex;
	align-items: center;
	gap: 8px;

	:hover {
		cursor: pointer;
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		:first-of-type {
			margin-left: auto;
		}
	}
`

interface IDenomination {
	active?: boolean
}

export const Denomination = styled.a<IDenomination>`
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

export const formatProtocolsTvlChartData = ({ historicalChainTvls, extraTvlEnabled, tvlChartData }) => {
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
}
