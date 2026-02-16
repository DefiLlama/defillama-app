import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IPieChartProps } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { getForkPageData } from '~/containers/Forks/queries'
import { useCalcGroupExtraTvlsByDay, useCalcStakePool2Tvl } from '~/hooks/data'
import Layout from '~/layout'
import { formattedNum, tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

interface IForksRow {
	name: string
	forkedProtocols: number
	tvl: number
	ftot: number
}

const forksColumn: ColumnDef<IForksRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo logo={tokenIconUrl(getValue())} data-lgonly />

					<BasicLink
						href={`/forks/${getValue()}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue() as string}
					</BasicLink>
				</span>
			)
		}
	},
	{
		header: 'Forked Protocols',
		accessorKey: 'forkedProtocols',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Forks TVL / Original TVL',
		accessorKey: 'ftot',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value != null ? value.toFixed(2) + '%' : null}</>
		},
		meta: {
			align: 'end'
		}
	}
]

export const getStaticProps = withPerformanceLogging('forks', async () => {
	const data = await getForkPageData()

	if (!data) return { notFound: true, props: null }

	return {
		props: { ...data },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'TVL in Forks']
const DEFAULT_SORTING_STATE = [{ id: 'tvl', desc: true }]

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
			const ftot = tokenTvl ? (Number(value.toFixed(2)) / Number(tokenTvl.toFixed(2))) * 100 : null

			return {
				name,
				forkedProtocols: tokensProtocols[name],
				tvl: value,
				ftot: ftot
			}
		})

		return { tokenTvls, tokensList }
	}, [chainsWithExtraTvlsByDay, tokensProtocols, forkedTokensData])

	const { dominanceDataset, dominanceCharts } = React.useMemo(() => {
		return {
			dominanceDataset: {
				source: chainsWithExtraTvlsAndDominanceByDay.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokens]
			},
			dominanceCharts: tokens.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				color: forkColors[name],
				stack: 'dominance'
			}))
		}
	}, [chainsWithExtraTvlsAndDominanceByDay, tokens, forkColors])

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
				<div className="relative isolate flex flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<PieChart
							chartData={tokenTvls}
							stackColors={forkColors}
							exportButtons={{ png: true, csv: true, filename: 'forks-tvl-pie', pngTitle: 'TVL by Fork' }}
							title="TVL by Fork"
						/>
					</React.Suspense>
				</div>
				<div className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							dataset={dominanceDataset}
							charts={dominanceCharts}
							stacked={true}
							expandTo100Percent={true}
							hideDefaultLegend
							valueSymbol="%"
							exportButtons={{
								png: true,
								csv: true,
								filename: 'forks-dominance-chart',
								pngTitle: 'Fork TVL Dominance'
							}}
							title="Fork TVL Dominance"
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
					sortingState={DEFAULT_SORTING_STATE}
				/>
			</React.Suspense>
		</Layout>
	)
}
