import * as React from 'react'
import { useRouter } from 'next/router'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { ILineAndBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { tvlOptions } from '~/components/Filters/options'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { formatNum, getPercentChange, preparePieChartData, toNiceCsvDate } from '~/utils'
import { ChainsByCategoryTable } from './Table'
import { IChainsByCategoryData } from './types'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

const pageName = ['Chains']

export function ChainsByCategory({
	chains,
	colorsByChain,
	allCategories,
	category,
	tvlChartsByChain,
	totalTvlByDate,
	description,
	keywords
}: IChainsByCategoryData) {
	const { pieChartData, dominanceCharts } = useFormatChartData({
		tvlChartsByChain,
		totalTvlByDate,
		colorsByChain
	})

	const { showByGroup, chainsTableData } = useGroupAndFormatChains({ chains, category })

	const prepareCsv = React.useCallback(() => {
		const headers = ['Date', 'Timestamp']
		for (const chain in dominanceCharts) {
			headers.push(chain)
		}

		const domByDate: Record<string, Record<string, number>> = {}
		for (const chain in dominanceCharts) {
			for (const [date, dominance] of dominanceCharts[chain].data) {
				domByDate[date] = domByDate[date] ?? {}
				domByDate[date][chain] = dominance
			}
		}

		const rows: Array<Array<string | number>> = []
		for (const date in domByDate) {
			const row: Array<string | number> = [toNiceCsvDate(+date / 1e3), date]
			for (const chain in dominanceCharts) {
				row.push(domByDate[date][chain] ?? '')
			}
			rows.push(row)
		}

		return { filename: `defillama-chains-dominance.csv`, rows: [headers, ...rows] as (string | number | boolean)[][] }
	}, [dominanceCharts])

	return (
		<Layout
			title={`${category} Chains DeFi TVL - DefiLlama`}
			description={description}
			keywords={keywords}
			canonicalUrl={`/chains${category === 'All' ? '' : `/${category}`}`}
			metricFilters={tvlOptions}
			metricFiltersLabel="Include in TVL"
			pageName={pageName}
		>
			<RowLinksWithDropdown links={allCategories} activeLink={category} />

			<div className="flex flex-col gap-2 xl:flex-row">
				<div className="relative isolate flex min-h-[408px] flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<React.Suspense fallback={<></>}>
						<PieChart chartData={pieChartData} stackColors={colorsByChain} />
					</React.Suspense>
				</div>
				<div className="min-h-[408px] flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<CSVDownloadButton prepareCsv={prepareCsv} smol className="mr-2 ml-auto" />
					<React.Suspense fallback={<></>}>
						<LineAndBarChart charts={dominanceCharts} valueSymbol="%" expandTo100Percent solidChartAreaStyle />
					</React.Suspense>
				</div>
			</div>

			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${chainsTableData.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<ChainsByCategoryTable data={chainsTableData} showByGroup={showByGroup} />
			</React.Suspense>
		</Layout>
	)
}

const useFormatChartData = ({
	tvlChartsByChain,
	totalTvlByDate,
	colorsByChain
}: {
	tvlChartsByChain: IChainsByCategoryData['tvlChartsByChain']
	totalTvlByDate: IChainsByCategoryData['totalTvlByDate']
	colorsByChain: IChainsByCategoryData['colorsByChain']
}) => {
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const data = React.useMemo(() => {
		const charts: ILineAndBarChartProps['charts'] = {}
		const toggledTvlSettings = Object.entries(tvlSettings)
			.filter(([_, value]) => value)
			.map(([key]) => key)
		const recentTvlByChain: Record<string, number> = {}

		for (const chain in tvlChartsByChain['tvl']) {
			const data = []
			for (const date in totalTvlByDate['tvl']) {
				let total = totalTvlByDate['tvl'][date]
				let value = tvlChartsByChain['tvl']?.[chain]?.[date]
				for (const key of toggledTvlSettings) {
					if (tvlChartsByChain[key]?.[chain]?.[date] != null) {
						value = (value ?? 0) + (tvlChartsByChain[key]?.[chain]?.[date] ?? 0)
					}
					total += totalTvlByDate?.[key]?.[date] ?? 0
				}
				recentTvlByChain[chain] = value
				data.push([+date, value != null ? (value / total) * 100 : null])
			}
			charts[chain] = {
				name: chain,
				stack: chain,
				type: 'line' as const,
				color: colorsByChain[chain],
				data: data.filter((_, index) => index % 2 === 1 && index !== data.length)
			}
		}

		return { dominanceCharts: charts, pieChartData: preparePieChartData({ data: recentTvlByChain, limit: 10 }) }
	}, [tvlSettings, totalTvlByDate, tvlChartsByChain, colorsByChain])

	return data
}

export const useGroupAndFormatChains = ({
	chains,
	category,
	hideGroupBy = false
}: {
	chains: IChainsByCategoryData['chains']
	category: string
	hideGroupBy?: boolean
}) => {
	const { query } = useRouter()

	const minMaxTvl = React.useMemo(() => {
		const { minTvl, maxTvl } = query
		return JSON.stringify({
			minTvl: typeof minTvl === 'string' && minTvl !== '' ? +minTvl : null,
			maxTvl: typeof maxTvl === 'string' && maxTvl !== '' ? +maxTvl : null
		})
	}, [query])

	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [chainsGroupbyParent] = useLocalStorageSettingsManager('tvl_chains')

	return React.useMemo(() => {
		const showByGroup = ['All', 'Non-EVM'].includes(category) && !hideGroupBy ? true : false
		const toggledTvlSettings = Object.entries(tvlSettings)
			.filter(([_, value]) => value)
			.map(([key]) => key)
		const toggledChainsGroupbyParent = Object.entries(chainsGroupbyParent)
			.filter(([_, value]) => value)
			.map(([key]) => key)
		const { minTvl, maxTvl } = JSON.parse(minMaxTvl)

		const data = chains
			.map((chain) => {
				let finalTvl: number | null = chain.tvl
				let finalTvlPrevDay: number | null = chain.tvlPrevDay
				let finalTvlPrevWeek: number | null = chain.tvlPrevWeek
				let finalTvlPrevMonth: number | null = chain.tvlPrevMonth

				for (const key of toggledTvlSettings) {
					finalTvl = (finalTvl ?? 0) + (chain.extraTvl?.[key]?.tvl ?? 0)
					finalTvlPrevDay = (finalTvlPrevDay ?? 0) + (chain.extraTvl?.[key]?.tvlPrevDay ?? 0)
					finalTvlPrevWeek = (finalTvlPrevWeek ?? 0) + (chain.extraTvl?.[key]?.tvlPrevWeek ?? 0)
					finalTvlPrevMonth = (finalTvlPrevMonth ?? 0) + (chain.extraTvl?.[key]?.tvlPrevMonth ?? 0)
				}

				if (['doublecounted', 'liquidstaking'].every((key) => toggledTvlSettings.includes(key))) {
					finalTvl = (finalTvl ?? 0) - (chain.extraTvl?.dcAndLsOverlap?.tvl ?? 0)
					finalTvlPrevDay = (finalTvlPrevDay ?? 0) - (chain.extraTvl?.dcAndLsOverlap?.tvlPrevDay ?? 0)
					finalTvlPrevWeek = (finalTvlPrevWeek ?? 0) - (chain.extraTvl?.dcAndLsOverlap?.tvlPrevWeek ?? 0)
					finalTvlPrevMonth = (finalTvlPrevMonth ?? 0) - (chain.extraTvl?.dcAndLsOverlap?.tvlPrevMonth ?? 0)
				}

				const change_1d = getPercentChange(finalTvl, finalTvlPrevDay)
				const change_7d = getPercentChange(finalTvl, finalTvlPrevWeek)
				const change_1m = getPercentChange(finalTvl, finalTvlPrevMonth)

				return {
					...chain,
					tvl: finalTvl,
					tvlPrevDay: finalTvlPrevDay,
					tvlPrevWeek: finalTvlPrevWeek,
					tvlPrevMonth: finalTvlPrevMonth,
					change_1d,
					change_7d,
					change_1m,
					mcaptvl: chain.mcap && finalTvl ? +formatNum(+chain.mcap.toFixed(2) / +finalTvl.toFixed(2)) : null
				}
			})
			.filter((chain) => (minTvl ? chain.tvl >= minTvl : true) && (maxTvl ? chain.tvl <= maxTvl : true))

		if (!showByGroup) return { showByGroup, chainsTableData: data }
		const trackedSubChains = new Set<string>()

		const chainsTableData = []
		for (const chain of data) {
			const subChainsList = new Set()
			for (const group of toggledChainsGroupbyParent) {
				if (chain?.['childGroups']?.[group]) {
					for (const subChain of chain['childGroups'][group]) {
						subChainsList.add(subChain)
						trackedSubChains.add(subChain)
					}
				}
			}

			// already counted as subchain of another chain
			if (trackedSubChains.has(chain.name)) {
				continue
			}

			if (subChainsList.size === 0) {
				chainsTableData.push(chain)
				continue
			}

			const subChains = data.filter((chain) => subChainsList.has(chain.name))
			const subRows = [chain].concat(subChains)

			const {
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth,
				mcap,
				stablesMcap,
				users,
				totalVolume24h,
				totalFees24h,
				totalRevenue24h,
				totalAppRevenue24h,
				chainAssets,
				nftVolume
			} = subRows.reduce(
				(acc, chain) => {
					acc.tvl += chain.tvl
					acc.tvlPrevDay += chain.tvlPrevDay
					acc.tvlPrevWeek += chain.tvlPrevWeek
					acc.tvlPrevMonth += chain.tvlPrevMonth
					acc.mcap += chain.mcap
					acc.stablesMcap += chain.stablesMcap
					acc.users += chain.users
					acc.totalVolume24h += chain.totalVolume24h
					acc.totalFees24h += chain.totalFees24h
					acc.totalRevenue24h += chain.totalRevenue24h
					acc.totalAppRevenue24h += chain.totalAppRevenue24h
					acc.chainAssets = {
						total: {
							total: +(acc.chainAssets.total?.total ?? 0) + +(chain.chainAssets?.total?.total ?? 0)
						},
						canonical: {
							total: +(acc.chainAssets.canonical?.total ?? 0) + +(chain.chainAssets?.canonical?.total ?? 0)
						},
						ownTokens: {
							total: +(acc.chainAssets.ownTokens?.total ?? 0) + +(chain.chainAssets?.ownTokens?.total ?? 0)
						},
						native: {
							total: +(acc.chainAssets.native?.total ?? 0) + +(chain.chainAssets?.native?.total ?? 0)
						},
						thirdParty: {
							total: +(acc.chainAssets.thirdParty?.total ?? 0) + +(chain.chainAssets?.thirdParty?.total ?? 0)
						}
					}
					acc.nftVolume += chain.nftVolume
					return acc
				},
				{
					tvl: 0,
					tvlPrevDay: 0,
					tvlPrevWeek: 0,
					tvlPrevMonth: 0,
					mcap: 0,
					stablesMcap: 0,
					users: 0,
					totalVolume24h: 0,
					totalFees24h: 0,
					totalRevenue24h: 0,
					totalAppRevenue24h: 0,
					chainAssets: {
						total: { total: 0 },
						canonical: { total: 0 },
						ownTokens: { total: 0 },
						native: { total: 0 },
						thirdParty: { total: 0 }
					},
					nftVolume: 0
				}
			)

			const change_1d = getPercentChange(tvl, tvlPrevDay)
			const change_7d = getPercentChange(tvl, tvlPrevWeek)
			const change_1m = getPercentChange(tvl, tvlPrevMonth)
			const mcaptvl = mcap && tvl ? +formatNum(+mcap.toFixed(2) / +tvl.toFixed(2)) : null

			chainsTableData.push({
				...chain,
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth,
				mcap,
				change_1d,
				change_7d,
				change_1m,
				mcaptvl,
				protocols: null,
				users,
				totalVolume24h,
				totalFees24h,
				totalRevenue24h,
				totalAppRevenue24h,
				chainAssets,
				nftVolume,
				stablesMcap,
				subRows
			})
		}

		return { showByGroup, chainsTableData: chainsTableData.sort((a, b) => b.tvl - a.tvl) }
	}, [category, chains, tvlSettings, minMaxTvl, chainsGroupbyParent, hideGroupBy])
}
