import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import Layout from '~/layout'
import { Panel } from '~/components'
import { ProtocolsChainsSearch } from '~/components/Search'
import { maxAgeForNext } from '~/api'
import { getLSDPageData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { formattedNum, toK } from '~/utils'

import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { LSDColumn } from '~/components/Table/Defi/columns'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export const getStaticProps = withPerformanceLogging('lsd', async () => {
	const data = await getLSDPageData()

	const finalData = getChartData({ ...data.props })

	return {
		props: { ...finalData },
		revalidate: maxAgeForNext([22])
	}
})

const ChartsWrapper = styled(Panel)`
	min-height: 402px;
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;

	& > * {
		grid-cols: span 1;
	}

	@media screen and (min-width: 80rem) {
		grid-template-columns: 1fr 1fr;
	}
`
const PageView = ({ areaChartData, pieChartData, tokensList, tokens, stakedEthSum, stakedEthInUsdSum, lsdColors }) => {
	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'ETH Liquid Staking Derivatives' }} />

			<TotalLocked>
				<span>Total Value Locked ETH LSDs</span>

				<span> {`${formattedNum(stakedEthSum)} ETH ($${toK(stakedEthInUsdSum)})`}</span>
			</TotalLocked>

			<ChartsWrapper>
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
				/>
			</ChartsWrapper>
			<TableWithSearch
				data={tokensList}
				columns={LSDColumn}
				columnToSearch={'name'}
				placeholder={'Search protocols...'}
			/>
		</>
	)
}

const TotalLocked = styled(Header)`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;

	& > *:last-child {
		font-family: var(--font-jetbrains);
	}
`

export default function LSDs(props) {
	return (
		<Layout title={`Liquid Staking Derivatives - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}

function getChartData({ chartData, lsdRates, lsdApy, lsdColors }) {
	const historicData = chartData
		.map((protocol) => {
			const tokensArray = protocol.chainTvls['Ethereum'].tokens
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
			const p = protocol.chainTvls['Ethereum']

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

			const eth = lastTokens[Object.keys(lastTokens).filter((k) => k.includes('ETH'))[0]]
			const eth7d =
				lastTokens7d !== undefined ? lastTokens7d[Object.keys(lastTokens7d)?.filter((k) => k.includes('ETH'))[0]] : null
			const eth30d =
				lastTokens30d !== undefined
					? lastTokens30d[Object.keys(lastTokens30d)?.filter((k) => k.includes('ETH'))[0]]
					: null

			return {
				name: protocol.name,
				logo: protocol.logo,
				mcap: protocol.mcap,
				stakedEth: eth,
				stakedEthInUsd: lastTokensInUsd[Object.keys(lastTokensInUsd).filter((k) => k.includes('ETH'))[0]],
				stakedEthPctChange7d: eth7d !== null ? ((eth - eth7d) / eth7d) * 100 : null,
				stakedEthPctChange30d: eth30d !== null ? ((eth - eth30d) / eth30d) * 100 : null
			}
		})
		.filter((p) => p.stakedEth !== undefined)
		.sort((a, b) => b.stakedEth - a.stakedEth)

	const stakedEthSum = tokenTvls.reduce((sum, a) => sum + a.stakedEth, 0)
	const stakedEthInUsdSum = tokenTvls.reduce((sum, a) => sum + a.stakedEthInUsd, 0)
	const tokensList = tokenTvls.map((p) => {
		const priceInfo = lsdRates.marketRates?.find(
			(i) =>
				i.sellTokenAddress?.toLowerCase() ===
				lsdRates.expectedRates.find((r) => r.name === p.name)?.address.toLowerCase()
		)
		const expectedInfo = lsdRates.expectedRates.find((r) => r.name === p.name)

		const marketRate = priceInfo?.buyAmount / 10 ** 18
		const expectedRate = expectedInfo?.expectedRate

		const ethPeg = (marketRate / expectedRate - 1) * 100
		const pegInfo = expectedInfo?.peg

		const mcaptvl = p.mcap / p.stakedEthInUsd

		return {
			...p,
			marketShare: (p.stakedEth / stakedEthSum) * 100,
			lsdSymbol: expectedInfo?.symbol ?? null,
			ethPeg: p.name === 'SharedStake' ? null : ethPeg ?? null,
			pegInfo: pegInfo ?? null,
			marketRate: marketRate ?? null,
			expectedRate: expectedRate ?? null,
			mcapOverTvl: mcaptvl ? mcaptvl.toFixed(2) : null,
			apy: lsdApy.find((m) => m.name === p.name)?.apy ?? null
		}
	})

	const pieChartData = tokenTvls.map((p) => ({ name: p.name, value: p.stakedEth }))

	const tokens = tokensList.map((p) => p.name)

	return { areaChartData, pieChartData, tokensList, tokens, stakedEthSum, stakedEthInUsdSum, lsdColors }
}
