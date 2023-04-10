import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { ToggleWrapper2 } from '~/components'
import { useDenominationPriceHistory } from '~/api/categories/protocols/client'
import { useDefiManager } from '~/contexts/LocalStorage'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import type { IChartProps } from '../types'
import { nearestUtc } from '~/utils'

const AreaChart = dynamic(() => import('.'), {
	ssr: false
}) as React.FC<IChartProps>

interface IProps {
	protocol: string
	color: string
	historicalChainTvls: {}
	chains: string[]
	volumeMap?: Record<number, number>
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

	const { denomination, tvl, mcap, events, showVolume } = router.query

	const showMcap = mcap === 'true'
	const hideHallmarks = events === 'false'
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
		router.isReady && denomination ? DENOMINATIONS.find((d) => d.symbol === denomination)?.geckoId : null
	)

	// fetch protocol mcap data
	const { data: protocolCGData, loading } = useDenominationPriceHistory(
		router.isReady && mcap === 'true' ? geckoId : null
	)

	// update tvl calc based on extra tvl options like staking, pool2 selected
	const chartDataFiltered = React.useMemo(() => {
		return formatProtocolsTvlChartData({ historicalChainTvls, extraTvlEnabled })
	}, [historicalChainTvls, extraTvlEnabled])

	// calc y-axis based on denomination
	const { tvlData, valueSymbol } = React.useMemo(() => {
		const isValidDenomination =
			denomination && denomination !== 'USD' && DENOMINATIONS.find((d) => d.symbol === denomination)

		if (isValidDenomination && denominationHistory?.prices?.length > 0) {
			const newChartData = []

			chartDataFiltered.forEach(([date, tvl]) => {
				let priceAtDate = denominationHistory.prices.find((x) => x[0] === Number(date) * 1000)

				if (!priceAtDate) {
					priceAtDate = denominationHistory.prices.find(
						(x) => -432000000 < x[0] - Number(date) * 1000 && x[0] - Number(date) * 1000 < 432000000
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

	// append mcap data when api return it
	const { finalData, tokensUnique, stackColors } = React.useMemo(() => {
		const tokensUnique = []

		const chartData = {}

		const isHourlyTvl = tvlData.length > 2 ? tvlData[1] - tvlData[0] < 80_000 : true

		if (tvlData.length > 0 && tvl !== 'false') {
			tokensUnique.push('TVL')

			tvlData.forEach(([dateS, TVL]) => {
				const date = isHourlyTvl ? dateS : Math.floor(nearestUtc(dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = { ...chartData[date], TVL }
			})
		}

		if (geckoId && showMcap && protocolCGData) {
			tokensUnique.push('Mcap')

			protocolCGData['market_caps'].map(([dateMs, Mcap]) => {
				const date = Math.floor(nearestUtc(dateMs) / 1000)
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = { ...chartData[date], Mcap }
			})
		}

		if (showVol) {
			tokensUnique.push('Volume')

			for (const date in volumeMap) {
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = { ...chartData[date], Volume: volumeMap[date] }
			}
		}

		const stackColors = color ? { ...chartColors, TVL: color } : chartColors

		const finalData = Object.entries(chartData).map(([date, values]: [string, { [key: string]: number }]) => ({
			date,
			...values
		}))

		return {
			finalData,
			tokensUnique,
			stackColors
		}
	}, [tvlData, protocolCGData, showMcap, geckoId, showVol, volumeMap, color, tvl])

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
					<ToggleWrapper2>
						<input
							type="checkbox"
							value="showVolume"
							checked={router.query.showVolume === 'true'}
							onChange={() => toggleFilter('showVolume')}
						/>
						<span>Show Volume</span>
					</ToggleWrapper2>
				)}
			</FiltersWrapper>

			{!loading && !denominationLoading && (
				<AreaChart
					chartData={finalData}
					color={color}
					title=""
					valueSymbol={valueSymbol}
					stacks={tokensUnique}
					hallmarks={!hideHallmarks && hallmarks}
					tooltipSort={false}
					stackColors={stackColors}
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

export const formatProtocolsTvlChartData = ({ historicalChainTvls, extraTvlEnabled }) => {
	const tvlDictionary: { [key: number]: number } = {}

	for (const section in historicalChainTvls) {
		const name = section.toLowerCase()

		// skip sum of keys like ethereum-staking, arbitrum-vesting
		if (!name.includes('-') && name !== 'offers') {
			// sum key with staking, ethereum, arbitrum etc
			if (Object.keys(extraTvlEnabled).includes(name) ? extraTvlEnabled[name] : true) {
				historicalChainTvls[section].tvl?.forEach(
					({ date, totalLiquidityUSD }: { date: number; totalLiquidityUSD: number }, index) => {
						let nearestDate = date

						// roundup timestamps on last tvl values in chart
						if (index > historicalChainTvls[section].tvl!.length - 2 && !tvlDictionary[date]) {
							const prevDate = historicalChainTvls[section].tvl[index - 1]?.date
							// only change timestamp if prev timestamp is at UTC 00:00
							if (prevDate && new Date(prevDate * 1000).getUTCHours() === 0) {
								// find date in tvlDictionary
								for (
									let i = prevDate + 1;
									i <= Number((new Date().getTime() / 1000).toFixed(0)) && nearestDate === date;
									i++
								) {
									if (tvlDictionary[i]) {
										nearestDate = i
									}
								}
							}
						}

						if (!tvlDictionary[nearestDate]) {
							tvlDictionary[nearestDate] = 0
						}

						tvlDictionary[nearestDate] += totalLiquidityUSD
					}
				)
			}
		}
	}

	return Object.entries(tvlDictionary)
}
