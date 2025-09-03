import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { forksColumn } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { getForkPageData } from '~/containers/Forks/queries'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl } from '~/hooks/data'
import Layout from '~/layout'
import { preparePieChartData } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

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

const pageName = ['Protocols', 'ranked by', 'TVL in Forks']

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

	const prepareCsv = React.useCallback(() => {
		const headers = ['Name', 'Forked Protocols', 'TVL', 'Forked TVL / Original TVL %']
		const csvData = tokensList.map((row) => {
			return {
				Name: row.name,
				'Forked Protocols': row.forkedProtocols,
				TVL: row.tvl,
				'Forked TVL / Original TVL %': row.ftot
			}
		})
		const rows = [headers].concat(csvData.map((row) => headers.map((header) => row[header])))
		return { filename: 'forks.csv', rows: rows as (string | number | boolean)[][] }
	}, [tokensList])

	return (
		<Layout
			title={`Forks - DefiLlama`}
			description={`Overview of protocols by their forks value. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`forks, protocol forks, forks on blockchain`}
			canonicalUrl={`/forks`}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={tokenLinks} activeLink={'All'} />
			<div className="flex flex-col gap-1 xl:flex-row">
				<div className="relative isolate flex min-h-[408px] flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<CSVDownloadButton prepareCsv={prepareCsv} smol className="mr-2 ml-auto" />
					<React.Suspense fallback={<></>}>
						<PieChart chartData={tokenTvls} stackColors={forkColors} />
					</React.Suspense>
				</div>
				<div className="min-h-[408px] flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<React.Suspense fallback={<></>}>
						<AreaChart
							chartData={chainsWithExtraTvlsAndDominanceByDay}
							stacks={tokens}
							stackColors={forkColors}
							hideDefaultLegend
							valueSymbol="%"
							title=""
							expandTo100Percent={true}
						/>
					</React.Suspense>
				</div>
			</div>
			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${tokensList.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
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
