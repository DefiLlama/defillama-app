import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'
import Layout from '~/layout'
import { Panel } from '~/components'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl } from '~/hooks/data'
import { maxAgeForNext } from '~/api'
import { getForkPageData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'

import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { forksColumn } from '~/components/Table/Defi/columns'
import CSVDownloadButton from '~/components/ButtonStyled/CsvButton'
import { download } from '~/utils'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

// @ts-ignore TODO: getForkPageData shouldn't be concerned with 'notFound' param, should be just about data
export const getStaticProps = withPerformanceLogging('forks', async () => {
	const data = await getForkPageData()

	return {
		...data,
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
const PageView = ({ chartData, tokensProtocols, tokens, tokenLinks, parentTokens, forkColors }) => {
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

	const downloadCSV = () => {
		const headers = ['Name', 'Forked Protocols', 'TVL', 'Forked TVL / Original TVL %']
		const csvData = tokensList.map((row) => {
			return {
				Name: row.name,
				'Forked Protocols': row.forkedProtocols,
				TVL: row.tvl,
				'Forked TVL / Original TVL %': row.ftot
			}
		})
		const csv = [headers].concat(csvData.map((row) => headers.map((header) => row[header]))).join('\n')
		download('forks.csv', csv)
	}

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Forks' }} />

			<Header style={{ display: 'flex', justifyContent: 'space-between' }}>
				Total Value Locked All Forks <CSVDownloadButton onClick={downloadCSV} />
			</Header>

			<ChartsWrapper>
				<PieChart chartData={tokenTvls} stackColors={forkColors} />
				<AreaChart
					chartData={chainsWithExtraTvlsAndDominanceByDay}
					stacks={tokens}
					stackColors={forkColors}
					customLegendName="Fork"
					customLegendOptions={tokens}
					hideDefaultLegend
					valueSymbol="%"
					title=""
					expandTo100Percent={true}
				/>
			</ChartsWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={tokenLinks} activeLink="All" />
			</RowLinksWrapper>

			<TableWithSearch
				data={tokensList}
				columns={forksColumn}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
			/>
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
