import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import Layout from '~/layout'
import { Header } from '~/Theme'
import { Panel } from '~/components'
import { OraclesTable } from '~/components/VirtualTable'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { useCalcGroupExtraTvlsByDay } from '~/hooks/data'
import { getRandomColor } from '~/utils'
import { revalidate } from '~/api'
import { getOraclePageData } from '~/api/categories/protocols'

import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export async function getStaticProps() {
	const data = await getOraclePageData()

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
const PageView = ({ chartData, tokensProtocols, tokens, tokenLinks }) => {
	const colorsByOracle = React.useMemo(() => {
		const colors = {}

		tokens.forEach((chain) => {
			colors[chain] = getRandomColor()
		})

		return colors
	}, [tokens])

	const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = useCalcGroupExtraTvlsByDay(chartData)

	const { tokenTvls, tokensList } = React.useMemo(() => {
		const tvls = Object.entries(chainsWithExtraTvlsByDay[chainsWithExtraTvlsByDay.length - 1])
			.filter((item) => item[0] !== 'date')
			.map((token) => ({ name: token[0], value: token[1] } as { name: string; value: number }))
			.sort((a, b) => b.value - a.value)

		const otherTvl = tvls.slice(5).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		const tokenTvls = tvls.slice(0, 5).concat({ name: 'Others', value: otherTvl })

		const tokensList = tvls.map(({ name, value }) => {
			return { name, protocolsSecured: tokensProtocols[name], tvs: value }
		})

		return { tokenTvls, tokensList }
	}, [chainsWithExtraTvlsByDay, tokensProtocols])

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Oracles' }} />

			<Header>Total Value Secured All Oracles</Header>

			<ChartsWrapper>
				<PieChart chartData={tokenTvls} stackColors={colorsByOracle} />
				<AreaChart
					chartData={chainsWithExtraTvlsAndDominanceByDay}
					stacks={tokens}
					stackColors={colorsByOracle}
					customLegendName="Oracle"
					customLegendOptions={tokens}
					hidedefaultlegend
					valueSymbol="%"
					title=""
				/>
			</ChartsWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={tokenLinks} activeLink="All" />
			</RowLinksWrapper>

			<OraclesTable data={tokensList} />
		</>
	)
}

export default function Oracles(props) {
	return (
		<Layout title={`Oracles - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
