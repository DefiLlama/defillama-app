import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import Layout from '~/layout'
import { Panel } from '~/components'
import { LSDTable } from '~/components/Table'
import { ProtocolsChainsSearch } from '~/components/Search'
import { maxAgeForNext } from '~/api'
import { getLSDPageData } from '~/api/categories/protocols'

import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export async function getStaticProps() {
	const data = await getLSDPageData()

	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
}

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
const PageView = ({ tokens, chartData, lsdColors }) => {
	const historicData = chartData
		.map((protocol) => {
			const tokensArray = protocol.chainTvls['Ethereum'].tokens
			return tokensArray.map((t) => {
				return {
					name: protocol.name,
					date: Math.floor(t.date / 24 / 60 / 60) * 60 * 60 * 24,
					value: t.tokens[Object.keys(t.tokens).filter((k) => k.includes('ETH'))[0]]
				}
			})
		})
		.flat()
		.filter((p) => p.value > 0)

	const uniqueDates = [...new Set(historicData.map((p) => p.date))]

	const areaChartData = uniqueDates
		.map((d) => {
			const dayData = historicData.filter((z) => z.date === d)

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

	const { pieChartData, tokensList } = React.useMemo(() => {
		let tokenTvls = chartData
			.map((protocol) => {
				const p = protocol.chainTvls['Ethereum']
				const lastTokens = p.tokens.slice(-1)[0].tokens
				const lastTokensInUsd = p.tokensInUsd.slice(-1)[0].tokens

				return {
					name: protocol.name,
					stakedEth: lastTokens[Object.keys(lastTokens).filter((k) => k.includes('ETH'))[0]],
					stakedEthInUsd: lastTokensInUsd[Object.keys(lastTokensInUsd).filter((k) => k.includes('ETH'))[0]]
				}
			})
			.filter((p) => p.stakedEth !== undefined)
			.sort((a, b) => b.stakedEth - a.stakedEth)

		const stakedEthSum = tokenTvls.reduce((sum, a) => sum + a.stakedEth, 0)
		const tokensList = tokenTvls.map((p) => ({ ...p, marketShare: (p.stakedEth / stakedEthSum) * 100 }))

		const pieChartData = tokenTvls.map((p) => ({ name: p.name, value: p.stakedEth }))

		return { pieChartData, tokensList }
	}, [chartData])

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'ETH Liquid Staking Derivates' }} />

			<Header>Total Value Locked ETH LSDs</Header>

			<ChartsWrapper>
				<PieChart chartData={pieChartData} stackColors={lsdColors} usdFormat={false} />
				<AreaChart
					chartData={areaChartData}
					stacks={tokens}
					stackColors={lsdColors}
					customLegendName="LSD"
					customLegendOptions={tokens}
					hidedefaultlegend
					valueSymbol="%"
					title=""
				/>
			</ChartsWrapper>

			<LSDTable data={tokensList} />
		</>
	)
}

export default function LSDs(props) {
	return (
		<Layout title={`Liquid Staking Derivates - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
