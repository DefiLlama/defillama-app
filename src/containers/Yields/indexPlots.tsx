import { useRouter } from 'next/router'
import * as React from 'react'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { YieldFiltersV2 } from './Filters'
import { useFormatYieldQueryParams } from './hooks'
import { normalizeToken, toFilterPool } from './utils'

interface IChartProps {
	chartData: any
	title?: string
	xAxisLabel?: string
	yAxisLabel?: string
}

interface ITreemapProps {
	treeData: any[]
	height?: string
}

const ScatterChart = React.lazy(() => import('~/components/ECharts/ScatterChart')) as React.FC<IChartProps>
const BoxplotChart = React.lazy(() => import('~/components/ECharts/BoxplotChart')) as React.FC<IChartProps>
const TreemapChart = React.lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<ITreemapProps>
const MultiSeriesChart2 = React.lazy(() => import('./YieldsMultiSeriesChart')) as React.FC<IMultiSeriesChart2Props>

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
		const pair_tokens = pairTokens.map((token) => normalizeToken(token))
		const include_tokens = includeTokens.map((token) => normalizeToken(token))
		const excludeTokensSet = new Set(excludeTokens.map((token) => normalizeToken(token)))
		const exact_tokens = exactTokens.map((token) => normalizeToken(token))

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
		const parseTimestampToEpochMs = (value: unknown): number | null => {
			if (value == null) return null

			if (typeof value === 'number') {
				if (!Number.isFinite(value)) return null
				// Heuristic: treat small epoch values as seconds.
				if (value > 0 && value < 1e10) return Math.trunc(value * 1e3)
				return Math.trunc(value)
			}

			if (typeof value !== 'string') return null
			const s = value.trim()
			if (!s) return null

			// Numeric strings (epoch seconds/ms)
			if (/^-?\d+(\.\d+)?$/.test(s)) {
				const n = Number(s)
				return parseTimestampToEpochMs(n)
			}

			// YYYY-MM-DD (treat as UTC midnight)
			if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
				const ms = Date.parse(`${s}T00:00:00.000Z`)
				return Number.isFinite(ms) ? ms : null
			}

			// Full ISO or other parseable date strings
			const ms = Date.parse(s)
			return Number.isFinite(ms) ? ms : null
		}

		const rows = (median ?? []).map((r) => {
			const medianApyRaw = Number(r?.medianAPY)
			const avg7DayRaw = r?.avg7day == null ? null : Number(r.avg7day)

			return {
				// Keep this UTC-stable (avoid local timezone shifts)
				timestamp: parseTimestampToEpochMs(r?.timestamp),
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
		const toFixed2Safe = (v: unknown) => {
			const n = typeof v === 'number' ? v : Number(v)
			return Number.isFinite(n) ? parseFloat(n.toFixed(2)) : 0
		}

		const treeDataByProject = new Map<
			string,
			{ tvl: number; children: { value: [unknown, number, number]; name: string; path: string }[] }
		>()

		// structure into hierarchy in a single pass
		for (const pool of poolsData) {
			if (pool.apyPct1D == null) continue

			const project = pool.projectName
			const projectData = treeDataByProject.get(project) ?? { tvl: 0, children: [] }
			projectData.tvl += typeof pool.tvlUsd === 'number' && Number.isFinite(pool.tvlUsd) ? pool.tvlUsd : 0
			projectData.children.push({
				value: [pool.tvlUsd, toFixed2Safe(pool.apy), toFixed2Safe(pool.apyPct1D)],
				name: pool.symbol,
				path: `${pool.projectName}/${pool.symbol}`
			})
			treeDataByProject.set(project, projectData)
		}

		return Array.from(treeDataByProject, ([project, projectData]) => ({
			value: [projectData.tvl, null, null],
			name: project,
			path: project,
			children: projectData.children
		}))
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
					<ScatterChart
						chartData={nonOutlierPoolsData}
						title="APY Average vs Volatility"
						xAxisLabel="APY Standard Deviation"
						yAxisLabel="APY Geometric Average"
					/>
				</div>
			</React.Suspense>
			<React.Suspense fallback={<></>}>
				<BoxplotChart chartData={nonOutlierPoolsData} />
			</React.Suspense>
		</>
	)
}
