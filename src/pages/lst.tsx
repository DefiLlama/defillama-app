import * as React from 'react'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { maxAgeForNext } from '~/api'
import { getLSDPageData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { formattedNum, firstDayOfMonth, lastDayOfWeek, toK } from '~/utils'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { LSDColumn } from '~/components/Table/Defi/columns'
import { COINS_PRICES_API } from '~/constants'
import { fetchJson } from '~/utils/async'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

export const getStaticProps = withPerformanceLogging('lsd', async () => {
	const data = await getLSDPageData()

	const finalData = await getChartData({ ...data.props })

	return {
		props: { ...finalData, tokensList: finalData.tokensList.filter((lsd) => lsd.name !== 'diva') },
		revalidate: maxAgeForNext([22])
	}
})

const PageView = ({
	areaChartData,
	pieChartData,
	tokensList,
	tokens,
	stakedEthSum,
	stakedEthInUsdSum,
	lsdColors,
	inflowsChartData,
	barChartStacks
}) => {
	const [tab, setTab] = React.useState('breakdown')
	const [groupBy, setGroupBy] = React.useState<'daily' | 'weekly' | 'monthly' | 'cumulative'>('weekly')

	const inflowsData = React.useMemo(() => {
		const store = {}

		const isWeekly = groupBy === 'weekly'
		const isMonthly = groupBy === 'monthly'
		const isCumulative = groupBy === 'cumulative'
		const totalByToken = {}
		for (const date in inflowsChartData) {
			for (const token in inflowsChartData[date]) {
				const dateKey = isWeekly ? lastDayOfWeek(+date * 1e3) : isMonthly ? firstDayOfMonth(+date * 1e3) : date
				if (!store[dateKey]) {
					store[dateKey] = {}
				}
				store[dateKey][token] =
					(store[dateKey][token] || 0) + inflowsChartData[date][token] + (totalByToken[token] || 0)

				if (isCumulative) {
					totalByToken[token] = (totalByToken[token] || 0) + inflowsChartData[date][token]
				}
			}
		}
		const finalData = []

		for (const date in store) {
			const dateStore = store[date]
			dateStore.date = date
			finalData.push(dateStore)
		}

		return finalData
	}, [inflowsChartData, groupBy])

	return (
		<>
			<ProtocolsChainsSearch />
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
				<h1 className="text-xl font-semibold flex items-center justify-between gap-4 flex-wrap p-3">
					<span>Total Value Locked ETH LSTs</span>
					<span className="font-jetbrains">{`${formattedNum(stakedEthSum)} ETH ($${toK(stakedEthInUsdSum)})`}</span>
				</h1>

				<div className="bg-(--cards-bg) rounded-md w-full flex flex-col">
					<div className="flex flex-wrap overflow-x-auto border-y border-(--form-control-border)">
						<button
							className="py-2 px-6 whitespace-nowrap border-(--form-control-border) data-[selected=true]:border-b data-[selected=true]:border-b-(--primary1) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							onClick={() => setTab('breakdown')}
							data-selected={tab === 'breakdown'}
						>
							Breakdown
						</button>
						<button
							className="py-2 px-6 whitespace-nowrap border-l border-(--form-control-border) data-[selected=true]:border-b data-[selected=true]:border-b-(--primary1) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
							onClick={() => setTab('inflows')}
							data-selected={tab === 'inflows'}
						>
							Inflows
						</button>
					</div>

					<div className="flex flex-col items-center gap-4 min-h-[408px] w-full">
						{tab === 'breakdown' ? (
							<div className="w-full grid grid-cols-1 xl:grid-cols-2 *:col-span-1 pt-12 xl:*:*:[&[role='combobox']]:-mt-9!">
								<React.Suspense fallback={<></>}>
									<PieChart chartData={pieChartData} stackColors={lsdColors} usdFormat={false} />
								</React.Suspense>
								<React.Suspense fallback={<></>}>
									<AreaChart
										chartData={areaChartData}
										stacks={tokens}
										stackColors={lsdColors}
										customLegendName="LST"
										customLegendOptions={tokens}
										hideDefaultLegend
										valueSymbol="%"
										title=""
										expandTo100Percent={true}
									/>
								</React.Suspense>
							</div>
						) : (
							<div className="flex flex-col w-full gap-1">
								<div className="text-xs font-medium m-3 ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-(--form-control-border) text-[#666] dark:text-[#919296]">
									<button
										data-active={groupBy === 'daily'}
										className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
										onClick={() => setGroupBy('daily')}
									>
										Daily
									</button>

									<button
										data-active={groupBy === 'weekly'}
										className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
										onClick={() => setGroupBy('weekly')}
									>
										Weekly
									</button>

									<button
										data-active={groupBy === 'monthly'}
										className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
										onClick={() => setGroupBy('monthly')}
									>
										Monthly
									</button>

									<button
										data-active={groupBy === 'cumulative'}
										className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
										onClick={() => setGroupBy('cumulative')}
									>
										Cumulative
									</button>
								</div>

								{groupBy === 'cumulative' ? (
									<React.Suspense fallback={<></>}>
										<AreaChart
											chartData={inflowsData}
											stacks={tokens}
											stackColors={lsdColors}
											customLegendName="LST"
											customLegendOptions={tokens}
											hideDefaultLegend
											valueSymbol="ETH"
											title=""
										/>
									</React.Suspense>
								) : (
									<React.Suspense fallback={<></>}>
										<BarChart
											chartData={inflowsData}
											hideDefaultLegend
											customLegendName="Protocol"
											customLegendOptions={tokens}
											stacks={barChartStacks}
											stackColors={lsdColors}
											valueSymbol="ETH"
											title=""
										/>
									</React.Suspense>
								)}
							</div>
						)}
					</div>
				</div>

				<TableWithSearch
					data={tokensList}
					columns={LSDColumn}
					columnToSearch={'name'}
					placeholder={'Search protocols...'}
				/>
			</div>
		</>
	)
}

export default function LSDs(props) {
	return (
		<Layout title={`Liquid Staking Tokens - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}

async function getChartData({ chartData, lsdRates, lsdApy, lsdColors }) {
	// for beth we are adding up values on ethereum and bsc chain
	const beth = chartData.find((protocol) => protocol.name === 'Binance staked ETH')

	const combineEthereumBSC = (tokensKey) => {
		return beth.chainTvls['Ethereum'][tokensKey].map((i) => {
			const bethBSC = beth.chainTvls['BSC'][tokensKey].find((j) => j.date === i.date)

			const bethOnEthereum = i.tokens['ETH'] ?? i.tokens['WETH']
			const bethOnBsc = bethBSC?.tokens['ETH'] ?? bethBSC?.tokens['WETH']

			return {
				date: i.date,
				tokens: { ETH: bethOnEthereum + bethOnBsc }
			}
		})
	}

	const bethTVL = combineEthereumBSC('tokens')
	const bethTVLUsd = combineEthereumBSC('tokensInUsd')
	chartData = chartData.map((protocol) => {
		if (protocol.name === 'Binance staked ETH') {
			protocol.chainTvls['Ethereum'].tokens = bethTVL
			protocol.chainTvls['Ethereum'].tokensInUsd = bethTVLUsd
		}
		return protocol
	})

	// Fetch ETH price from API
	const fetchEthPrice = async () => {
		try {
			const data = await fetchJson(`${COINS_PRICES_API}/current/ethereum:0x0000000000000000000000000000000000000000`)
			return data.coins['ethereum:0x0000000000000000000000000000000000000000'].price
		} catch (error) {
			console.error('Error fetching ETH price:', error)
			return null
		}
	}

	const ethPrice = await fetchEthPrice()
	const PRICE_DIFF_THRESHOLD = 0.01 // 1% difference threshold

	const historicData = chartData
		.map((protocol) => {
			const tokensArray =
				protocol.name === 'Crypto.com Staked ETH'
					? protocol.chainTvls['Cronos'].tokens
					: protocol.chainTvls['Ethereum'].tokens

			return tokensArray.map((t, i, arr) => {
				const date = (d) => Math.floor(d.date / 24 / 60 / 60) * 60 * 60 * 24
				if (i > 0 && date(arr[i - 1]) == date(t)) {
					return { value: 0 }
				}
				// get all ETH related token keys
				const ethKeys = Object.keys(t.tokens).filter((k) => k.includes('ETH'))

				// sum up all ETH token values
				const totalEthValue = ethKeys.reduce((sum, key) => {
					return sum + t.tokens[key]
				}, 0)

				//
				return {
					name: protocol.name,
					date: date(t),
					value: totalEthValue
				}
			})
		})
		.flat()
		.filter((p) => p.value > 0)

	const uniqueDates = [...new Set(historicData.map((p) => p.date))]

	let areaChartData = uniqueDates
		.map((d: number) => {
			let dayData = historicData.filter((z) => z.date === d)

			// on the 27th of august, lido is duplicated, removing dupes
			if (d === 1630022400) {
				dayData = dayData.filter((v, i, a) => a.findIndex((v2) => v2.name === v.name) === i)
			}
			// there are few days for which we don't have lido data, removing those
			if (d > 1608321600 && dayData.find((x) => x.name === 'Lido')?.name === undefined) return {}

			const stakedEthSumDay = dayData.reduce((sum, a) => sum + a.value, 0)
			return dayData
				.map((p) => ({ date: p.date, [p.name]: (p.value / stakedEthSumDay) * 100 }))
				.reduce(function (acc, x) {
					for (let key in x) acc[key] = x[key]
					return acc
				}, {})
		})
		.sort((a, b) => a.date - b.date)

	// ffill data from 12of may to 13th and 14th
	// const may12th = areaChartData.find((t) => t.date === 1620777600)
	// 13th is missing
	// areaChartData = [...areaChartData, { ...may12th, date: 1620864000 }]
	// fill 14th
	// for (const d of areaChartData) {
	// 	if (d.date === 1620950400) {
	// 		for (const k of Object.keys(may12th)) {
	// 			if (k === 'date') continue
	// 			d[k] = may12th[k]
	// 		}
	// 	}
	// }

	const roundDate = (date) => Math.floor(date / 24 / 60 / 60) * 60 * 60 * 24
	const secDay = 86400
	const tokenTvls = chartData
		.map((protocol) => {
			const p =
				protocol.name === 'Crypto.com Staked ETH' ? protocol.chainTvls['Cronos'] : protocol.chainTvls['Ethereum']

			if (p.tokens.length < 1) {
				return {
					name: protocol.name,
					logo: protocol.logo,
					mcap: protocol.mcap
				}
			}

			const lastDate = p.tokens.slice(-1)[0].date

			const offset7d = roundDate(lastDate - 7 * secDay)
			const offset30d = roundDate(lastDate - 30 * secDay)

			const lastTokens = p.tokens.slice(-1)[0].tokens
			const lastTokensInUsd = p.tokensInUsd.slice(-1)[0].tokens

			const lastTokens7d = p.tokens.find((x) => x.date === offset7d)?.tokens
			const lastTokens30d = p.tokens.find((x) => x.date === offset30d)?.tokens

			const getETH = (obj: any) => {
				const potentialETH = Object.keys(obj).filter((k) => k.includes('ETH'))
				const eth = potentialETH.reduce((max, item) => (obj[item] > max ? obj[item] : max), 0)
				return eth
			}

			const eth = getETH(lastTokens)
			const ethInUsd = getETH(lastTokensInUsd)
			const eth7d = lastTokens7d !== undefined ? getETH(lastTokens7d) : null
			const eth30d = lastTokens30d !== undefined ? getETH(lastTokens30d) : null

			// Validate and correct stakedEth value if needed
			let correctedEth = eth
			if (ethPrice && ethInUsd) {
				const calculatedEth = ethInUsd / ethPrice
				const diff = Math.abs(calculatedEth - eth) / eth
				if (diff > PRICE_DIFF_THRESHOLD) {
					console.log(
						`Correcting ${protocol.name} stakedEth from ${eth} to ${calculatedEth} (${diff * 100}% difference)`
					)
					correctedEth = calculatedEth
				}
			}

			return {
				name: protocol.name,
				logo: protocol.logo,
				mcap: protocol.mcap,
				stakedEth: correctedEth,
				stakedEthInUsd: ethInUsd,
				stakedEthPctChange7d: eth7d !== null ? ((correctedEth - eth7d) / eth7d) * 100 : null,
				stakedEthPctChange30d: eth30d !== null ? ((correctedEth - eth30d) / eth30d) * 100 : null
			}
		})
		.filter((p) => p.stakedEth !== 0)
		.sort((a, b) => b.stakedEth - a.stakedEth)

	const rebase = 'Rebase Token: Staking rewards accrue as new tokens. Expected Peg = 1 : 1'
	const valueAccruing = 'Value Accruing Token: Staking rewards are earned in form of an appreciating LSD value.'

	const stakedEthSum = tokenTvls.reduce((sum, a) => sum + a.stakedEth, 0)
	const stakedEthInUsdSum = tokenTvls.reduce((sum, a) => sum + a.stakedEthInUsd, 0)

	const tokensList = tokenTvls.map((p) => {
		const lsd = lsdRates.find((i) => i.name === p.name)

		const type = lsd?.type
		const pegInfo = type === 'rebase' ? rebase : type === 'accruing' ? valueAccruing : null

		const mcaptvl = p.mcap / p.stakedEthInUsd

		return {
			...p,
			marketShare: (p.stakedEth / stakedEthSum) * 100,
			lsdSymbol: lsd?.symbol ?? null,
			ethPeg: p.name === 'SharedStake' ? null : lsd?.ethPeg ?? null,
			pegInfo,
			marketRate: lsd?.marketRate ?? null,
			expectedRate: lsd?.expectedRate ?? null,
			mcapOverTvl: mcaptvl ? mcaptvl.toFixed(2) : null,
			apy: lsdApy.find((m) => m.name === p.name)?.apy ?? null,
			fee: lsd?.fee > 0 ? lsd?.fee * 100 : null
		}
	})

	const pieChartData = tokenTvls.map((p) => ({ name: p.name, value: p.stakedEth }))

	const tokens = tokensList.map((p) => p.name)

	const inflowsChartData: { [date: number]: { [token: string]: number } } = {}
	const barChartStacks = {}

	// calc daily inflow per LSD
	tokens.forEach((protocol) => {
		// sort ascending
		const X = historicData.filter((i) => i.name === protocol).sort((a, b) => a.date - b.date)

		const current = X.slice(1)
		const previous = X.slice(0, -1)

		current.forEach((c, i) => {
			if (!inflowsChartData[c.date]) {
				inflowsChartData[c.date] = {}
			}

			inflowsChartData[c.date][c.name] = c.value - previous[i].value
		})

		barChartStacks[protocol] = 'A'
	})

	return {
		areaChartData,
		pieChartData,
		tokensList,
		tokens,
		stakedEthSum,
		stakedEthInUsdSum,
		lsdColors,
		inflowsChartData,
		barChartStacks
	}
}
