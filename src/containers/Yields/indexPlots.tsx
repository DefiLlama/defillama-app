import { ToolboxComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { UniversalTransition } from 'echarts/features'
import { useRouter } from 'next/router'
import * as React from 'react'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { YieldFiltersV2 } from './Filters'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'

interface IChartProps {
	chartData: any
}

interface ITreemapProps {
	treeData: any[]
	height?: string
}

const ScatterChart = React.lazy(() => import('~/components/ECharts/ScatterChart')) as React.FC<IChartProps>
const BoxplotChart = React.lazy(() => import('~/components/ECharts/BoxplotChart')) as React.FC<IChartProps>
const TreemapChart = React.lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapProps>
const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

echarts.use([ToolboxComponent, UniversalTransition])

export const PlotsPage = ({
	pools,
	chainList,
	projectList,
	categoryList,
	median,
	tokens,
	tokenSymbolsList,
	usdPeggedSymbols,
	evmChains
}) => {
	const { pathname } = useRouter()

	const {
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		selectedCategories,
		pairTokens,
		minTvl,
		maxTvl,
		minApy,
		maxApy
	} = useFormatYieldQueryParams({ projectList, chainList, categoryList, evmChains })

	const poolsData = React.useMemo(() => {
		const pair_tokens = pairTokens.map((token) => token.toLowerCase())
		const include_tokens = includeTokens.map((token) => token.toLowerCase())
		const excludeTokensSet = new Set(excludeTokens.map((token) => token.toLowerCase()))
		const exact_tokens = exactTokens.map((token) => token.toLowerCase())

		const selectedProjectsSet = new Set(selectedProjects)
		const selectedChainsSet = new Set(selectedChains)
		const selectedCategoriesSet = new Set(selectedCategories)

		return pools.reduce((acc, curr) => {
			const toFilter = toFilterPool({
				curr,
				pathname,
				selectedProjectsSet,
				selectedChainsSet,
				selectedAttributes,
				includeTokens: include_tokens,
				excludeTokensSet,
				exactTokens: exact_tokens,
				selectedCategoriesSet,
				minTvl,
				maxTvl,
				minApy,
				maxApy,
				pairTokens: pair_tokens,
				usdPeggedSymbols
			})

			if (toFilter) {
				return acc.concat(curr)
			} else return acc
		}, [])
	}, [
		minTvl,
		maxTvl,
		minApy,
		maxApy,
		pools,
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		selectedCategories,
		pathname,
		pairTokens,
		usdPeggedSymbols
	])

	const medianApyDataset = React.useMemo<MultiSeriesChart2Dataset>(() => {
		const rows = (median ?? []).map((r) => {
			const medianApyRaw = Number(r?.medianAPY)
			const avg7DayRaw = r?.avg7day == null ? null : Number(r.avg7day)

			return {
				// Keep this UTC-stable (avoid local timezone shifts)
				timestamp: new Date(`${r.timestamp}T00:00:00.000Z`).getTime(),
				'Median APY': Number.isFinite(medianApyRaw) ? Number(medianApyRaw.toFixed(3)) : null,
				'7-day Average': avg7DayRaw == null ? null : Number.isFinite(avg7DayRaw) ? Number(avg7DayRaw.toFixed(3)) : null
			}
		})

		return {
			dimensions: ['timestamp', 'Median APY', '7-day Average'],
			source: ensureChronologicalRows(rows)
		}
	}, [median])

	const nonOutlierPoolsData = React.useMemo(() => poolsData.filter((p) => !p.outlier), [poolsData])

	const treemapTreeData = React.useMemo(() => {
		const treeData = []

		const cData = poolsData.filter((p) => p.apyPct1D !== null)

		// structure into hierarchy
		for (let project of [...new Set(cData.map((p) => p.projectName))]) {
			const projectData = cData.filter((p) => p.projectName === project)
			const projectTvl = projectData.map((p) => p.tvlUsd).reduce((a, b) => a + b, 0)

			treeData.push({
				value: [projectTvl, null, null],
				name: project,
				path: project,
				children: projectData.map((p) => ({
					value: [p.tvlUsd, parseFloat(p.apy.toFixed(2)), parseFloat(p.apyPct1D.toFixed(2))],
					name: p.symbol,
					path: `${p.projectName}/${p.symbol}`
				}))
			})
		}

		return treeData
	}, [poolsData])

	return (
		<>
			<YieldFiltersV2
				header="Yields Overview"
				tokens={tokens}
				tokensList={tokenSymbolsList}
				selectedTokens={includeTokens}
				chainList={chainList}
				selectedChains={selectedChains}
				evmChains={evmChains}
				projectList={projectList}
				selectedProjects={selectedProjects}
				categoryList={categoryList}
				selectedCategories={selectedCategories}
				attributes={true}
				tvlRange={true}
				apyRange={true}
				resetFilters={true}
			/>

			<div className="relative flex flex-col rounded-md bg-(--cards-bg) p-3">
				<div className="mb-2 flex flex-col items-center justify-center">
					<h2 className="text-base font-semibold">Median APY Trend</h2>
					<p className="text-xs opacity-70">Calculated over all tracked pools on a given day</p>
				</div>
				<React.Suspense fallback={<div className="h-[600px]" />}>
					<MultiSeriesChart2
						dataset={medianApyDataset}
						charts={[
							{
								name: 'Median APY',
								type: 'bar',
								color: '#66c2a5',
								encode: { x: 'timestamp', y: 'Median APY' }
							},
							{
								name: '7-day Average',
								type: 'line',
								color: '#fc8d62',
								encode: { x: 'timestamp', y: '7-day Average' }
							}
						]}
						chartOptions={{
							legend: {
								left: 'center',
								top: 0
							},
							toolbox: {
								feature: {
									dataZoom: {},
									dataView: {},
									restore: {}
								} as any
							}
						}}
						valueSymbol="%"
						height="600px"
						hideDefaultLegend={false}
						exportButtons="hidden"
					/>
				</React.Suspense>
			</div>
			<React.Suspense fallback={<></>}>
				<TreemapChart treeData={treemapTreeData} height="800px" />
			</React.Suspense>
			<React.Suspense fallback={<></>}>
				<div className="relative rounded-md bg-(--cards-bg) p-3">
					<ScatterChart chartData={nonOutlierPoolsData} />
				</div>
			</React.Suspense>
			<React.Suspense fallback={<></>}>
				<BoxplotChart chartData={nonOutlierPoolsData} />
			</React.Suspense>
		</>
	)
}
