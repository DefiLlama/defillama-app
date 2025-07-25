import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { getForkPageData } from '~/containers/Forks/queries'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl } from '~/hooks/data'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Metrics } from '~/components/Metrics'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { forksColumn } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { download, preparePieChartData } from '~/utils'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

export const getStaticProps = withPerformanceLogging('forks', async () => {
	const data = await getForkPageData()

	if (!data) return { notFound: true, props: null }

	return {
		props: { ...data },
		revalidate: maxAgeForNext([22])
	}
})

export default function Forks({ chartData, tokensProtocols, tokens, tokenLinks, parentTokens, forkColors }) {
	const forkedTokensData = useCalcStakePool2Tvl(parentTokens)

	const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = useCalcGroupExtraTvlsByDay(chartData)

	const { tokenTvls, tokensList } = React.useMemo(() => {
		const tvls = Object.entries(chainsWithExtraTvlsByDay[chainsWithExtraTvlsByDay.length - 1])
			.filter((item) => item[0] !== 'date')
			.map((token) => ({ name: token[0], value: token[1] }))
			.sort((a, b) => b.value - a.value)

		const tokenTvls = preparePieChartData({
			data: tvls,
			limit: 5
		})

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
		<Layout title={`Forks - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />
			<Metrics currentMetric="TVL in forks" />
			<RowLinksWithDropdown links={tokenLinks} activeLink={'All'} />
			<div className="flex flex-col gap-1 xl:flex-row">
				<div className="isolate relative rounded-md p-3 bg-(--cards-bg) flex-1 min-h-[360px] flex flex-col">
					<CSVDownloadButton onClick={downloadCSV} className="ml-auto absolute right-3 top-3 z-10" />
					<React.Suspense fallback={<></>}>
						<PieChart chartData={tokenTvls} stackColors={forkColors} />
					</React.Suspense>
				</div>
				<div className="rounded-md p-3 bg-(--cards-bg) flex-1 min-h-[360px]">
					<React.Suspense fallback={<></>}>
						<AreaChart
							chartData={chainsWithExtraTvlsAndDominanceByDay}
							stacks={tokens}
							stackColors={forkColors}
							hideDefaultLegend
							valueSymbol="%"
							title=""
							expandTo100Percent={true}
							chartOptions={chartOptions}
						/>
					</React.Suspense>
				</div>
			</div>
			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${tokensList.length * 50 + 200}px` }}
						className="bg-(--cards-bg) border border-(--cards-border) rounded-md"
					/>
				}
			>
				<TableWithSearch
					data={tokensList}
					columns={forksColumn}
					placeholder={'Search protocols...'}
					columnToSearch={'name'}
					header={'Protocol Rankings'}
				/>
			</React.Suspense>
		</Layout>
	)
}

const chartOptions = {
	grid: {
		top: 10,
		bottom: 60,
		left: 0,
		right: 0
	},
	dataZoom: [{}, { bottom: 32, right: 6 }]
} as any
