import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { maxAgeForNext } from '~/api'
import { getLSDPageData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { formattedNum, toK } from '~/utils'

import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { LSDColumn } from '~/components/Table/Defi/columns'
import { primaryColor } from '~/constants/colors'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import { groupDataByDays } from '~/components/ECharts/ProtocolChart/useFetchAndFormatChartData'
import { Tab, TabList } from '~/components'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export const getStaticProps = withPerformanceLogging('lsd', async () => {
	const data = await getLSDPageData()

	const finalData = getChartData({ ...data.props })

	return {
		props: { ...finalData, tokensList: finalData.tokensList.filter((lsd) => lsd.name !== 'diva') },
		revalidate: maxAgeForNext([22])
	}
})

const TabContainer = styled.div`
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-height: 360px;
`
const ChartsContainer = styled.div`
	background-color: ${({ theme }) => theme.advancedBG};
	border: 1px solid ${({ theme }) => theme.bg3};
	border-radius: 8px;
`

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
	const [groupBy, setGroupBy] = React.useState<'daily' | 'weekly' | 'monthly' | 'cumulative'>('daily')

	const inflowsData = groupDataByDays(inflowsChartData, groupBy, tokens, true)

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'ETH Liquid Staking Derivatives' }} />

			<h1 className="text-2xl font-medium -mb-5 flex items-center justify-between gap-4 flex-wrap">
				<span>Total Value Locked ETH LSDs</span>
				<span className="font-jetbrains">{`${formattedNum(stakedEthSum)} ETH ($${toK(stakedEthInUsdSum)})`}</span>
			</h1>

			<ChartsContainer>
				<TabList>
					<Tab onClick={() => setTab('breakdown')} aria-selected={tab === 'breakdown'}>
						Breakdown
					</Tab>
					<Tab onClick={() => setTab('inflows')} aria-selected={tab === 'inflows'}>
						Inflows
					</Tab>
				</TabList>

				<TabContainer>
					{tab === 'breakdown' ? (
						<div className="grid grid-cols-1 xl:grid-cols-2 *:col-span-1 rounded-xl bg-[var(--bg6)] min-h-[360px]">
							<PieChart chartData={pieChartData} stackColors={lsdColors} usdFormat={false} />

							<AreaChart
								chartData={areaChartData}
								stacks={tokens}
								stackColors={lsdColors}
								customLegendName="LSD"
								customLegendOptions={tokens}
								hideDefaultLegend
								valueSymbol="%"
								title=""
								expandTo100Percent={true}
							/>
						</div>
					) : (
						<>
							<Filters color={primaryColor} style={{ marginLeft: 'auto' }}>
								<Denomination as="button" active={groupBy === 'daily'} onClick={() => setGroupBy('daily')}>
									Daily
								</Denomination>

								<Denomination as="button" active={groupBy === 'weekly'} onClick={() => setGroupBy('weekly')}>
									Weekly
								</Denomination>

								<Denomination as="button" active={groupBy === 'monthly'} onClick={() => setGroupBy('monthly')}>
									Monthly
								</Denomination>

								<Denomination as="button" active={groupBy === 'cumulative'} onClick={() => setGroupBy('cumulative')}>
									Cumulative
								</Denomination>
							</Filters>

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
						</>
					)}
				</TabContainer>
			</ChartsContainer>

			<TableWithSearch
				data={tokensList}
				columns={LSDColumn}
				columnToSearch={'name'}
				placeholder={'Search protocols...'}
			/>
		</>
	)
}

export default function LSDs(props) {
	return (
		<Layout title={`Liquid Staking Derivatives - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}

function getChartData({ chartData, lsdRates, lsdApy, lsdColors }) {
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
				return {
					name: protocol.name,
					date: date(t),
					value: t.tokens[Object.keys(t.tokens).filter((k) => k.includes('ETH'))[0]]
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
			const eth7d = lastTokens7d !== undefined ? getETH(lastTokens7d) : null
			const eth30d = lastTokens30d !== undefined ? getETH(lastTokens30d) : null

			return {
				name: protocol.name,
				logo: protocol.logo,
				mcap: protocol.mcap,
				stakedEth: eth,
				stakedEthInUsd: getETH(lastTokensInUsd),
				stakedEthPctChange7d: eth7d !== null ? ((eth - eth7d) / eth7d) * 100 : null,
				stakedEthPctChange30d: eth30d !== null ? ((eth - eth30d) / eth30d) * 100 : null
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
