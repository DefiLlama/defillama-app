import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import Layout from '~/layout'
import { Panel } from '~/components'
import { ForksTable } from '~/components/VirtualTable'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl } from '~/hooks/data'
import { getRandomColor } from '~/utils'
import { revalidate } from '~/api'
import { getForkPageData } from '~/api/categories/protocols'

import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export async function getStaticProps() {
	const data = await getForkPageData()

	return {
		...data,
		revalidate: revalidate()
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
const PageView = ({ chartData, tokensProtocols, tokens, tokenLinks, parentTokens }) => {
	const colorsByFork = React.useMemo(() => {
		const colors = {}

		tokens.forEach((chain) => {
			colors[chain] = getRandomColor()
		})

		return colors
	}, [tokens])

	const forkedTokensData = useCalcStakePool2Tvl(parentTokens)

	const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = useCalcGroupExtraTvlsByDay(chartData)

	const { tokenTvls, tokensList } = React.useMemo(() => {
		const tvls = Object.entries(chainsWithExtraTvlsByDay[chainsWithExtraTvlsByDay.length - 1])
			.filter((item) => item[0] !== 'date')
			.map((token) => ({ name: token[0], value: token[1] }))
			.sort((a, b) => b.value - a.value)

		const otherTvl = tvls.slice(5).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		const tokenTvls = tvls.slice(0, 5).concat({ name: 'Others', value: otherTvl })

		const tokensList = tvls.map(({ name, value }) => {
			const tokenTvl = forkedTokensData.find((p) => p.name.toLowerCase() === name.toLowerCase())?.tvl ?? null
			const ftot = tokenTvl ? (value / tokenTvl) * 100 : null

			return {
				name,
				forkedProtocols: tokensProtocols[name],
				tvl: value,
				ftot: ftot
			}
		})

		return { tokenTvls, tokensList }
	}, [chainsWithExtraTvlsByDay, tokensProtocols, forkedTokensData])

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Forks' }} />

			<Header>Total Value Locked All Forks</Header>

			<ChartsWrapper>
				<PieChart chartData={tokenTvls} stackColors={colorsByFork} />
				<AreaChart
					chartData={chainsWithExtraTvlsAndDominanceByDay}
					stacks={tokens}
					stackColors={colorsByFork}
					customLegendName="Fork"
					customLegendOptions={tokens}
					hidedefaultlegend
					valueSymbol="%"
					title=""
				/>
			</ChartsWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={tokenLinks} activeLink="All" />
			</RowLinksWrapper>

			<ForksTable data={tokensList} />
		</>
	)
}

export default function Forks(props) {
	return (
		<Layout title={`Forks - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
