import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'
import { useDenominationPriceHistory, useFetchProtocolActiveUsers } from '~/api/categories/protocols/client'
import { useDefiManager } from '~/contexts/LocalStorage'
import { chainCoingeckoIds } from '~/constants/chainTokens'
import type { IChartProps } from '../types'
import { nearestUtc } from '~/utils'
import { useGetOverviewChartData } from '~/containers/DexsAndFees/charts/hooks'
import useSWR from 'swr'

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
	activeUsersId: number | string | null
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
	unlockTokenSymbol,
	activeUsersId
}: IProps) {
	const router = useRouter()

	const [extraTvlEnabled] = useDefiManager()

	const { denomination, tvl, mcap, tokenPrice, fdv, events, volume, fees, revenue, unlocks, activeUsers } = router.query

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
		router.isReady && (mcap === 'true' || tokenPrice === 'true' || fdv === 'true') ? geckoId : null
	)

	const { data: fdvData, error: fdvError } = useSWR(
		`fdv-${geckoId}-${fdv}-${router.isReady}`,
		geckoId && fdv === 'true' && router.isReady
			? () =>
					fetch(
						`https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
					).then((res) => res.json())
			: () => null
	)

	const fetchingFdv = !fdvData && fdvData !== null && !fdvError

	const {
		data: [feesAndRevenue],
		loading: fetchingFees
	} = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'fees',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: router.isReady && fees === 'true' && metrics.fees ? false : true
	})

	const { data: users, loading: fetchingActiveUsers } = useFetchProtocolActiveUsers(activeUsersId)

	const {
		data: [volumeData],
		loading: fetchingVolume
	} = useGetOverviewChartData({
		name: protocol,
		dataToFetch: 'dexs',
		type: 'chains',
		enableBreakdownChart: false,
		disabled: router.isReady && volume === 'true' && metrics.dexs ? false : true
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

		valueSymbol = d.symbol || ''
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

		if (geckoId && protocolCGData) {
			if (mcap === 'true') {
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

			if (tokenPrice === 'true') {
				tokensUnique.push('Token Price')

				protocolCGData['prices'].forEach(([dateMs, price]) => {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}

					chartData[date] = {
						...chartData[date],
						'Token Price': showNonUsdDenomination ? price / getPriceAtDate(date, denominationHistory.prices) : price
					}
				})

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['prices'].length > 0 &&
					protocolCGData['prices'][protocolCGData['prices'].length - 1][0] < +tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyTvl
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const tokenPrice = protocolCGData['prices'][protocolCGData['prices'].length - 1][1]

					chartData[date] = {
						...chartData[date],
						'Token Price': showNonUsdDenomination
							? tokenPrice / getPriceAtDate(date, denominationHistory.prices)
							: tokenPrice
					}
				}
			}

			if (fdv === 'true' && fdvData) {
				tokensUnique.push('FDV')

				const totalSupply = fdvData['market_data']['total_supply']

				protocolCGData['prices'].forEach(([dateMs, price]) => {
					const date = Math.floor(nearestUtc(dateMs) / 1000)
					if (!chartData[date]) {
						chartData[date] = {}
					}
					const fdv = totalSupply * price

					chartData[date] = {
						...chartData[date],
						FDV: showNonUsdDenomination ? fdv / getPriceAtDate(date, denominationHistory.prices) : fdv
					}
				})

				if (
					tvlData.length > 0 &&
					tvl !== 'false' &&
					protocolCGData['prices'].length > 0 &&
					protocolCGData['prices'][protocolCGData['prices'].length - 1][0] < +tvlData[tvlData.length - 1][0] * 1000
				) {
					const date = isHourlyTvl
						? tvlData[tvlData.length - 1][0]
						: Math.floor(nearestUtc(+tvlData[tvlData.length - 1][0] * 1000) / 1000)
					const tokenPrice = protocolCGData['prices'][protocolCGData['prices'].length - 1][1]
					const fdv = totalSupply * tokenPrice

					chartData[date] = {
						...chartData[date],
						FDV: showNonUsdDenomination ? fdv / getPriceAtDate(date, denominationHistory.prices) : fdv
					}
				}
			}
		}

		if (volume === 'true') {
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

		if (activeUsers === 'true' && users) {
			tokensUnique.push('Active Users')

			users.forEach((item) => {
				if (!chartData[item.date]) {
					chartData[item.date] = {}
				}

				chartData[item.date] = {
					...chartData[item.date],
					'Active Users': item['All'] || 0
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
		mcap,
		geckoId,
		volume,
		volumeData,
		tvl,
		showNonUsdDenomination,
		denominationHistory?.prices,
		feesAndRevenue,
		fees,
		revenue,
		router.isReady,
		unlocks,
		emissions,
		activeUsers,
		users,
		tokenPrice,
		fdv,
		fdvData
	])

	const fetchingTypes = []

	if (denominationLoading) {
		fetchingTypes.push(denomination + ' price')
	}

	if (loading) {
		if (mcap === 'true') {
			fetchingTypes.push('mcap')
		}

		if (tokenPrice === 'true') {
			fetchingTypes.push('token price')
		}
	}

	if ((loading || fetchingFdv) && fdv === 'true') {
		fetchingTypes.push('fdv')
	}

	if (fetchingFees) {
		if (fees === 'true') {
			fetchingTypes.push('fees')
		}

		if (revenue === 'true') {
			fetchingTypes.push('revenue')
		}
	}

	if (fetchingVolume) {
		fetchingTypes.push('volume')
	}

	if (fetchingActiveUsers) {
		fetchingTypes.push('active users')
	}

	const isLoading = loading || denominationLoading || fetchingFees || fetchingVolume || fetchingActiveUsers
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
								(tokenPrice ? `tokenPrice=${tokenPrice}&` : '') +
								(fdv ? `fdv=${fdv}&` : '') +
								(volume ? `volume=${volume}&` : '') +
								(fees ? `fees=${fees}&` : '') +
								(revenue ? `revenue=${revenue}&` : '') +
								(unlocks ? `unlocks=${unlocks}&` : '') +
								(activeUsers ? `activeUsers=${activeUsers}&` : '') +
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

			{!router.isReady ? null : isLoading ? (
				<p
					style={{ position: 'relative', top: '0', bottom: '0', margin: 'auto', textAlign: 'center' }}
				>{`Fetching ${fetchingTypes.join(', ')} ...`}</p>
			) : (
				<AreaChart
					chartData={finalData}
					color={color}
					title=""
					valueSymbol={valueSymbol}
					stacks={tokensUnique}
					hallmarks={!(events === 'false') && hallmarks}
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
	background-color: ${({ theme, color }) => (color ? transparentize(0.8, color) : transparentize(0.8, theme.primary1))};
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
