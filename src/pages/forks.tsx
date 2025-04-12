import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl } from '~/hooks/data'
import { maxAgeForNext } from '~/api'
import { getForkPageData } from '~/Forks/queries'
import { withPerformanceLogging } from '~/utils/perf'

import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { forksColumn } from '~/components/Table/Defi/columns'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { download } from '~/utils'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export const getStaticProps = withPerformanceLogging('forks', async () => {
	const data = await getForkPageData()

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
		<Layout title={`Forks - DefiLlama`} defaultSEO>
			<RowLinksWithDropdown links={tokenLinks} activeLink={'All'} />
			<div className="flex flex-col gap-1 xl:flex-row">
				<div className="isolate relative rounded-md p-3 bg-[var(--cards-bg)] flex-1 h-[360px] flex flex-col">
					<CSVDownloadButton onClick={downloadCSV} className="ml-auto absolute right-3 top-3 z-10" />
					<React.Suspense fallback={<></>}>
						<PieChart chartData={tokenTvls} stackColors={forkColors} />
					</React.Suspense>
				</div>
				<div className="rounded-md p-3 bg-[var(--cards-bg)] flex-1 h-[360px]">
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
					<div style={{ minHeight: `${tokensList.length * 50 + 200}px` }} className="bg-[var(--cards-bg)] rounded-md" />
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
