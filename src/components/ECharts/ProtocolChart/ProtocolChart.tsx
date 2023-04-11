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
import { useGetOverviewChartData } from '~/containers/DexsAndFees/charts/hooks'

const AreaChart = dynamic(() => import('.'), {
	ssr: false
}) as React.FC<IChartProps>

interface IProps {
	protocol: string
	color: string
	historicalChainTvls: {}
	chains: Array<string>
	bobo?: boolean
	hallmarks?: Array<[number, string]>
	geckoId?: string | null
	chartColors: { [type: string]: string }
	metrics: { [metric: string]: boolean }
	emissions?: Array<{
		[label: string]: number
	}>
	unlockTokenSymbol?: string
}

export default function ProtocolChart({
	protocol,
	color,
	historicalChainTvls,
	chains = [],
	bobo = false,
	hallmarks,
	geckoId,
	chartColors,
	metrics,
	emissions,
	unlockTokenSymbol
}: IProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useDefiManager()

	const { denomination, tvl, mcap, events, volume, fees, revenue, unlocks } = router.query

	const showMcap = mcap === 'true'
	const hideHallmarks = events === 'false'
	const showVol = volume === 'true'

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

	const [feesAndRevenue] = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'fees',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: metrics.fees ? false : true
	})

	const [volumeData] = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'dexs',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: metrics.dexs ? false : true
	})

	// update tvl calc based on extra tvl options like staking, pool2 selected
	const tvlData = React.useMemo(() => {
		return formatProtocolsTvlChartData({ historicalChainTvls, extraTvlEnabled })
	}, [historicalChainTvls, extraTvlEnabled])

	const showNonUsdDenomination =
		denomination &&
		denomination !== 'USD' &&
		DENOMINATIONS.find((d) => d.symbol === denomination) &&
		denominationHistory?.prices?.length > 0
			? true
			: false

	let valueSymbol = '$'
	if (showNonUsdDenomination) {
		const d = DENOMINATIONS.find((d) => d.symbol === denomination)

		if (d.symbol === 'ETH') {
			valueSymbol = 'Ξ'
		} else valueSymbol = d.symbol.slice(0, 1)
	}

	const { finalData, tokensUnique } = React.useMemo(() => {
		if (!router.isReady) {
			return { finalData: [], tokensUnique: [] }
		}
		const tokensUnique = []

		const chartData = {}

		const isHourlyTvl = tvlData.length > 2 ? +tvlData[1][0] - +tvlData[0][0] < 80_000 : true

		if (tvlData.length > 0 && tvl !== 'false') {
			tokensUnique.push('TVL')

			tvlData.forEach(([dateS, TVL]) => {
				const date = isHourlyTvl ? dateS : Math.floor(nearestUtc(+dateS * 1000) / 1000)

				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					TVL: showNonUsdDenomination ? TVL / getPriceAtDate(dateS, denominationHistory.prices) : TVL
				}
			})
		}

		if (geckoId && showMcap && protocolCGData) {
			tokensUnique.push('Mcap')

			protocolCGData['market_caps'].forEach(([dateMs, Mcap]) => {
				const date = Math.floor(nearestUtc(dateMs) / 1000)
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					Mcap: showNonUsdDenomination ? Mcap / getPriceAtDate(date, denominationHistory.prices) : Mcap
				}
			})

			if (
				tvlData.length > 0 &&
				tvl !== 'false' &&
				protocolCGData['market_caps'].length > 0 &&
				protocolCGData['market_caps'][protocolCGData['market_caps'].length - 1][0] <
					+tvlData[tvlData.length - 1][0] * 1000
			) {
				const date = isHourlyTvl
					? tvlData[tvlData.length - 1][0]
					: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
				const Mcap = protocolCGData['market_caps'][protocolCGData['market_caps'].length - 1][1]

				chartData[date] = {
					...chartData[date],
					Mcap: showNonUsdDenomination ? Mcap / getPriceAtDate(date, denominationHistory.prices) : Mcap
				}
			}
		}

		if (showVol) {
			tokensUnique.push('Volume')

			volumeData.forEach((item) => {
				const date = +item.date
				if (!chartData[date]) {
					chartData[date] = {}
				}

				chartData[date] = {
					...chartData[date],
					Volume: showNonUsdDenomination ? +item.Dexs / getPriceAtDate(date, denominationHistory.prices) : item.Dexs
				}
			})
		}

		if (feesAndRevenue.length > 0) {
			if (fees === 'true') {
				tokensUnique.push('Fees')
			}

			if (revenue === 'true') {
				tokensUnique.push('Revenue')
			}

			feesAndRevenue.forEach((item) => {
				const date = +item.date
				if (!chartData[date]) {
					chartData[date] = {}
				}

				if (fees === 'true') {
					chartData[date] = {
						...chartData[date],
						Fees: showNonUsdDenomination ? +item.Fees / getPriceAtDate(date, denominationHistory.prices) : item.Fees
					}
				}

				if (revenue === 'true') {
					chartData[date] = {
						...chartData[date],
						Revenue: showNonUsdDenomination
							? +item.Revenue / getPriceAtDate(date, denominationHistory.prices)
							: item.Revenue
					}
				}
			})
		}

		if (emissions && emissions.length > 0 && unlocks === 'true') {
			tokensUnique.push('Unlocks')
			emissions
				.filter((emission) => +emission.date * 1000 <= Date.now())
				.forEach((item) => {
					if (!chartData[item.date]) {
						chartData[item.date] = {}
					}

					let totalUnlocked = 0

					for (const label in item) {
						if (label !== 'date') {
							totalUnlocked += item[label]
						}
					}

					chartData[item.date] = {
						...chartData[item.date],
						Unlocks: totalUnlocked
					}
				})
		}

		const finalData = Object.entries(chartData).map(([date, values]: [string, { [key: string]: number }]) => ({
			date,
			...values
		}))

		return {
			finalData,
			tokensUnique
		}
	}, [
		tvlData,
		protocolCGData,
		showMcap,
		geckoId,
		showVol,
		volumeData,
		tvl,
		showNonUsdDenomination,
		denominationHistory?.prices,
		feesAndRevenue,
		fees,
		revenue,
		router.isReady,
		unlocks,
		emissions
	])

	return (
		<Wrapper>
			<FiltersWrapper>
				<Filters color={color}>
					{DENOMINATIONS.map((D) => (
						<Link
							href={
								`/protocol/${protocol}?` +
								(tvl ? `tvl=${tvl}&` : '') +
								(mcap ? `mcap=${mcap}&` : '') +
								(volume ? `volume=${volume}&` : '') +
								(fees ? `fees=${fees}&` : '') +
								(revenue ? `revenue=${revenue}&` : '') +
								(unlocks ? `unlocks=${unlocks}&` : '') +
								(events ? `events=${events}&` : '') +
								`denomination=${D.symbol}`
							}
							key={D.symbol}
							shallow
							passHref
						>
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
					color={color}
					title=""
					valueSymbol={valueSymbol}
					stacks={tokensUnique}
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
					unlockTokenSymbol={unlockTokenSymbol}
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

const getPriceAtDate = (date: string | number, history: Array<[number, number]>) => {
	let priceAtDate = history.find((x) => x[0] === Number(date) * 1000)

	if (!priceAtDate) {
		priceAtDate = history.find((x) => -432000000 < x[0] - Number(date) * 1000 && x[0] - Number(date) * 1000 < 432000000)
	}

	return priceAtDate?.[1] ?? 0
}
