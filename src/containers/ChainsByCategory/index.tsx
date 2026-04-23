import { useRouter } from 'next/router'
import * as React from 'react'
import type { IPieChartProps } from '~/components/ECharts/types'
import { ensureChronologicalRows, preparePieChartData } from '~/components/ECharts/utils'
import { EntityQuestionsStrip } from '~/components/EntityQuestionsStrip'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import {
	CHAINS_CATEGORY_GROUP_SETTINGS,
	TVL_SETTINGS_KEYS,
	useLocalStorageSettingsManager
} from '~/contexts/LocalStorage'
import { formatNum, getPercentChange } from '~/utils'
import { ChainsByCategoryTable } from './Table'
import { applyChainsTvlSettings } from './tvl'
import type { IChain, IChainsByCategoryData } from './types'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const getChartExtraValues = ({
	tvlChartsByChain,
	chain,
	date
}: {
	tvlChartsByChain: IChainsByCategoryData['tvlChartsByChain']
	chain: string
	date: string
}) => ({
	doublecounted: tvlChartsByChain.doublecounted?.[chain]?.[date],
	liquidstaking: tvlChartsByChain.liquidstaking?.[chain]?.[date],
	dcAndLsOverlap: tvlChartsByChain.dcAndLsOverlap?.[chain]?.[date],
	staking: tvlChartsByChain.staking?.[chain]?.[date],
	borrowed: tvlChartsByChain.borrowed?.[chain]?.[date],
	pool2: tvlChartsByChain.pool2?.[chain]?.[date],
	vesting: tvlChartsByChain.vesting?.[chain]?.[date]
})

const getTotalExtraValues = ({
	totalTvlByDate,
	date
}: {
	totalTvlByDate: IChainsByCategoryData['totalTvlByDate']
	date: string
}) => ({
	doublecounted: totalTvlByDate.doublecounted?.[date],
	liquidstaking: totalTvlByDate.liquidstaking?.[date],
	dcAndLsOverlap: totalTvlByDate.dcAndLsOverlap?.[date],
	staking: totalTvlByDate.staking?.[date],
	borrowed: totalTvlByDate.borrowed?.[date],
	pool2: totalTvlByDate.pool2?.[date],
	vesting: totalTvlByDate.vesting?.[date]
})

const getChainRowExtraValues = ({
	chain,
	metric
}: {
	chain: IChain
	metric: 'tvl' | 'tvlPrevDay' | 'tvlPrevWeek' | 'tvlPrevMonth'
}) => ({
	doublecounted: chain.extraTvl?.doublecounted?.[metric],
	liquidstaking: chain.extraTvl?.liquidstaking?.[metric],
	dcAndLsOverlap: chain.extraTvl?.dcAndLsOverlap?.[metric],
	staking: chain.extraTvl?.staking?.[metric],
	borrowed: chain.extraTvl?.borrowed?.[metric],
	pool2: chain.extraTvl?.pool2?.[metric],
	vesting: chain.extraTvl?.vesting?.[metric]
})

export function ChainsByCategory({
	chains,
	colorsByChain,
	allCategories,
	category: _category,
	categoryName,
	tvlChartsByChain,
	totalTvlByDate,
	entityQuestions
}: IChainsByCategoryData & { entityQuestions?: string[] }) {
	const { pieChartData, dominanceCharts } = useFormatChartData({
		tvlChartsByChain,
		totalTvlByDate,
		colorsByChain
	})

	const { showByGroup, chainsTableData } = useGroupAndFormatChains({ chains, category: categoryName })

	return (
		<>
			<RowLinksWithDropdown links={allCategories} activeLink={categoryName} />
			{entityQuestions?.length > 0 ? (
				<EntityQuestionsStrip questions={entityQuestions} entitySlug="chains" entityType="page" entityName="Chains" />
			) : null}

			<div className="flex flex-col gap-2 xl:flex-row">
				<div className="relative isolate flex flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<PieChart
							chartData={pieChartData}
							stackColors={colorsByChain}
							exportButtons={{ png: true, csv: true, filename: 'chains-tvl-pie', pngTitle: 'Chains TVL' }}
						/>
					</React.Suspense>
				</div>
				<div className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							dataset={dominanceCharts.dataset}
							charts={dominanceCharts.charts}
							valueSymbol="%"
							expandTo100Percent
							solidChartAreaStyle
							exportButtons={{ png: true, csv: true, filename: 'chains-dominance', pngTitle: 'Chains Dominance' }}
						/>
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
		</>
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
		const toggledTvlSettings = TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])
		const recentTvlByChain: Record<string, number> = {}
		const tvlByChain = tvlChartsByChain['tvl'] ?? {}
		const chainNames: string[] = []
		for (const chain in tvlByChain) {
			chainNames.push(chain)
		}

		const rowMap = new Map<number, Record<string, number | null>>()

		for (const chain of chainNames) {
			let lastValue: number | undefined
			for (const date in totalTvlByDate['tvl']) {
				const value = applyChainsTvlSettings(
					tvlChartsByChain['tvl']?.[chain]?.[date],
					getChartExtraValues({ tvlChartsByChain, chain, date }),
					toggledTvlSettings
				)
				const total = applyChainsTvlSettings(
					totalTvlByDate['tvl'][date],
					getTotalExtraValues({ totalTvlByDate, date }),
					toggledTvlSettings
				)
				lastValue = value ?? undefined
				const row = rowMap.get(+date) ?? { timestamp: +date }
				row[chain] = value != null && total != null && total !== 0 ? (value / total) * 100 : null
				rowMap.set(+date, row)
			}
			recentTvlByChain[chain] = lastValue ?? 0
		}

		const allRows = ensureChronologicalRows(Array.from(rowMap.values()))
		const source = allRows.filter((_, index) => index % 2 === 1)
		const dimensions = ['timestamp', ...chainNames]
		const chartsConfig = chainNames.map((chain) => ({
			type: 'line' as const,
			name: chain,
			encode: { x: 'timestamp', y: chain },
			stack: chain,
			color: colorsByChain[chain]
		}))

		return {
			dominanceCharts: { dataset: { source, dimensions }, charts: chartsConfig },
			pieChartData: preparePieChartData({ data: recentTvlByChain, limit: 10 })
		}
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
		const showByGroup = ['All', 'Non-EVM'].includes(category) && !hideGroupBy
		const toggledTvlSettings = TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])
		const toggledChainsGroupbyParent = CHAINS_CATEGORY_GROUP_SETTINGS.filter(
			(item) => chainsGroupbyParent[item.key]
		).map((item) => item.key)
		const { minTvl, maxTvl } = JSON.parse(minMaxTvl)

		const data = chains
			.map((chain) => {
				const finalTvl = applyChainsTvlSettings(
					chain.tvl,
					getChainRowExtraValues({ chain, metric: 'tvl' }),
					toggledTvlSettings
				)
				const finalTvlPrevDay = applyChainsTvlSettings(
					chain.tvlPrevDay,
					getChainRowExtraValues({ chain, metric: 'tvlPrevDay' }),
					toggledTvlSettings
				)
				const finalTvlPrevWeek = applyChainsTvlSettings(
					chain.tvlPrevWeek,
					getChainRowExtraValues({ chain, metric: 'tvlPrevWeek' }),
					toggledTvlSettings
				)
				const finalTvlPrevMonth = applyChainsTvlSettings(
					chain.tvlPrevMonth,
					getChainRowExtraValues({ chain, metric: 'tvlPrevMonth' }),
					toggledTvlSettings
				)

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
					mcaptvl:
						chain.mcap != null && finalTvl != null ? +formatNum(+chain.mcap.toFixed(2) / +finalTvl.toFixed(2)) : null
				}
			})
			.filter((chain) => (minTvl != null ? chain.tvl >= minTvl : true) && (maxTvl != null ? chain.tvl <= maxTvl : true))

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

			const subChains = data.filter((childChain) => subChainsList.has(childChain.name))
			const subRows = [chain].concat(subChains)

			const nullSum = (a: number | null, b: number | null): number | null =>
				a == null && b == null ? null : (a ?? 0) + (b ?? 0)

			const {
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth,
				mcap,
				stablesMcap,
				activeUsers24h,
				activeUsers7d,
				activeUsers30d,
				dexVolume24h,
				dexVolume7d,
				dexVolume30d,
				fees24h,
				fees7d,
				fees30d,
				revenue24h,
				revenue7d,
				revenue30d,
				appRevenue24h,
				appRevenue7d,
				appRevenue30d,
				chainAssets,
				nftVolume24h,
				nftVolume7d,
				nftVolume30d
			} = subRows.reduce(
				(acc, rowChain) => {
					acc.tvl = nullSum(acc.tvl, rowChain.tvl)
					acc.tvlPrevDay = nullSum(acc.tvlPrevDay, rowChain.tvlPrevDay)
					acc.tvlPrevWeek = nullSum(acc.tvlPrevWeek, rowChain.tvlPrevWeek)
					acc.tvlPrevMonth = nullSum(acc.tvlPrevMonth, rowChain.tvlPrevMonth)
					acc.mcap = nullSum(acc.mcap, rowChain.mcap)
					acc.stablesMcap = nullSum(acc.stablesMcap, rowChain.stablesMcap)
					acc.activeUsers24h = nullSum(acc.activeUsers24h, rowChain.activeUsers24h)
					acc.activeUsers7d = nullSum(acc.activeUsers7d, rowChain.activeUsers7d)
					acc.activeUsers30d = nullSum(acc.activeUsers30d, rowChain.activeUsers30d)
					acc.dexVolume24h = nullSum(acc.dexVolume24h, rowChain.dexVolume24h)
					acc.dexVolume7d = nullSum(acc.dexVolume7d, rowChain.dexVolume7d)
					acc.dexVolume30d = nullSum(acc.dexVolume30d, rowChain.dexVolume30d)
					acc.fees24h = nullSum(acc.fees24h, rowChain.fees24h)
					acc.fees7d = nullSum(acc.fees7d, rowChain.fees7d)
					acc.fees30d = nullSum(acc.fees30d, rowChain.fees30d)
					acc.revenue24h = nullSum(acc.revenue24h, rowChain.revenue24h)
					acc.revenue7d = nullSum(acc.revenue7d, rowChain.revenue7d)
					acc.revenue30d = nullSum(acc.revenue30d, rowChain.revenue30d)
					acc.appRevenue24h = nullSum(acc.appRevenue24h, rowChain.appRevenue24h)
					acc.appRevenue7d = nullSum(acc.appRevenue7d, rowChain.appRevenue7d)
					acc.appRevenue30d = nullSum(acc.appRevenue30d, rowChain.appRevenue30d)
					const aTotal = acc.chainAssets?.total?.total
					const bTotal = rowChain.chainAssets?.total?.total
					const aCanon = acc.chainAssets?.canonical?.total
					const bCanon = rowChain.chainAssets?.canonical?.total
					const aOwn = acc.chainAssets?.ownTokens?.total
					const bOwn = rowChain.chainAssets?.ownTokens?.total
					const aNative = acc.chainAssets?.native?.total
					const bNative = rowChain.chainAssets?.native?.total
					const aThird = acc.chainAssets?.thirdParty?.total
					const bThird = rowChain.chainAssets?.thirdParty?.total
					const allNull =
						aTotal == null &&
						bTotal == null &&
						aCanon == null &&
						bCanon == null &&
						aOwn == null &&
						bOwn == null &&
						aNative == null &&
						bNative == null &&
						aThird == null &&
						bThird == null
					acc.chainAssets = allNull
						? null
						: {
								total: { total: +(aTotal ?? 0) + +(bTotal ?? 0) },
								canonical: { total: +(aCanon ?? 0) + +(bCanon ?? 0) },
								ownTokens: { total: +(aOwn ?? 0) + +(bOwn ?? 0) },
								native: { total: +(aNative ?? 0) + +(bNative ?? 0) },
								thirdParty: { total: +(aThird ?? 0) + +(bThird ?? 0) }
							}
					acc.nftVolume24h = nullSum(acc.nftVolume24h, rowChain.nftVolume24h)
					acc.nftVolume7d = nullSum(acc.nftVolume7d, rowChain.nftVolume7d)
					acc.nftVolume30d = nullSum(acc.nftVolume30d, rowChain.nftVolume30d)
					return acc
				},
				{
					tvl: null as number | null,
					tvlPrevDay: null as number | null,
					tvlPrevWeek: null as number | null,
					tvlPrevMonth: null as number | null,
					mcap: null as number | null,
					stablesMcap: null as number | null,
					activeUsers24h: null as number | null,
					activeUsers7d: null as number | null,
					activeUsers30d: null as number | null,
					dexVolume24h: null as number | null,
					dexVolume7d: null as number | null,
					dexVolume30d: null as number | null,
					fees24h: null as number | null,
					fees7d: null as number | null,
					fees30d: null as number | null,
					revenue24h: null as number | null,
					revenue7d: null as number | null,
					revenue30d: null as number | null,
					appRevenue24h: null as number | null,
					appRevenue7d: null as number | null,
					appRevenue30d: null as number | null,
					nftVolume24h: null as number | null,
					nftVolume7d: null as number | null,
					nftVolume30d: null as number | null,
					chainAssets: null as {
						total: { total: number }
						canonical: { total: number }
						ownTokens: { total: number }
						native: { total: number }
						thirdParty: { total: number }
					} | null
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
				activeUsers24h,
				activeUsers7d,
				activeUsers30d,
				dexVolume24h,
				dexVolume7d,
				dexVolume30d,
				fees24h,
				fees7d,
				fees30d,
				revenue24h,
				revenue7d,
				revenue30d,
				appRevenue24h,
				appRevenue7d,
				appRevenue30d,
				nftVolume24h,
				nftVolume7d,
				nftVolume30d,
				chainAssets,
				stablesMcap,
				subRows
			})
		}

		return { showByGroup, chainsTableData: chainsTableData.sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0)) }
	}, [category, chains, tvlSettings, minMaxTvl, chainsGroupbyParent, hideGroupBy])
}
