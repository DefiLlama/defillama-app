import { fetchBlockExplorers } from '~/api'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { getBlockExplorerNew } from '~/utils/blockExplorers'
import type { IRWAList } from '~/utils/metadata/types'
import {
	fetchRWAActiveTVLs,
	fetchRWAAssetGroupBreakdownChartData,
	fetchRWAChainBreakdownChartData,
	fetchRWACategoryBreakdownChartData,
	fetchRWAPlatformBreakdownChartData,
	fetchRWAStats,
	fetchRWAChartDataByTicker,
	fetchRWAAssetDataById,
	fetchRWAAssetChartData,
	toUnixMsTimestamp
} from './api'
import type {
	IFetchedRWAProject,
	IRWAChartDataByTicker,
	IRWAProject,
	IRWAAssetsOverview,
	IRWAAssetData,
	IRWAChainsOverview,
	IRWAChainsOverviewRow,
	IRWACategoriesOverview,
	IRWACategoriesOverviewRow,
	IRWAPlatformsOverview,
	IRWAPlatformsOverviewRow,
	IRWAAssetGroupsOverview,
	IRWAAssetGroupsOverviewRow,
	RWATickerChartTarget
} from './api.types'
import { toBreakdownChartDataset } from './breakdownDataset'
import {
	aggregateRwaMetricData,
	applyDefaultAssetFilters,
	emptyChartDataset,
	type RWAChartAggregationMode
} from './chartAggregation'
import { definitions } from './definitions'
import { getRwaPlatforms, UNKNOWN_PLATFORM } from './grouping'
import { rwaSlug } from './rwaSlug'

type ChainMetricBreakdown = Record<string, number | string> | null
type DefiMetricBreakdown = Record<string, Record<string, number | string>> | null

const getRealRwaPlatforms = (value: Parameters<typeof getRwaPlatforms>[0]) =>
	getRwaPlatforms(value).filter((platform) => platform !== UNKNOWN_PLATFORM && rwaSlug(platform) !== 'unknown')

type AggregatedRwaMetrics = {
	totals: {
		onChainMcap: number
		activeMcap: number
		defiActiveTvl: number
	}
	filteredTotals: {
		onChainMcap: number
		activeMcap: number
		defiActiveTvl: number
	}
	hasSelectedChainData: {
		onChainMcap: boolean
		activeMcap: boolean
		defiActiveTvl: boolean
	}
	breakdowns: {
		onChainMcapByChain: Record<string, number>
		activeMcapByChain: Record<string, number>
		defiActiveTvlByProtocol: Record<string, number>
		defiActiveTvlByProtocolFiltered: Record<string, number>
		defiActiveTvlByChain: Record<string, number>
		defiActiveTvlByChainFiltered: Record<string, number>
	}
}

function aggregateRwaMetrics({
	onChainMcapBreakdown,
	activeMcapBreakdown,
	defiActiveTvlBreakdown,
	selectedChain
}: {
	onChainMcapBreakdown: ChainMetricBreakdown
	activeMcapBreakdown: ChainMetricBreakdown
	defiActiveTvlBreakdown: DefiMetricBreakdown
	selectedChain?: string
}): AggregatedRwaMetrics {
	let totalOnChainMcap = 0
	let totalActiveMcap = 0
	let totalDeFiActiveTvl = 0
	let filteredOnChainMcap = 0
	let filteredActiveMcap = 0
	let filteredDeFiActiveTvl = 0
	const onChainMcapByChain: Record<string, number> = {}
	const activeMcapByChain: Record<string, number> = {}
	const defiActiveTvlByProtocol: Record<string, number> = {}
	const defiActiveTvlByProtocolFiltered: Record<string, number> = {}
	const defiActiveTvlByChain: Record<string, number> = {}
	const defiActiveTvlByChainFiltered: Record<string, number> = {}
	let hasSelectedChainInOnChainMcap = false
	let hasSelectedChainInActiveMcap = false
	let hasSelectedChainInDeFiActiveTvl = false
	const isChainFiltered = !!selectedChain

	if (onChainMcapBreakdown) {
		for (const chain in onChainMcapBreakdown) {
			const value = safeNumber(onChainMcapBreakdown[chain])
			onChainMcapByChain[chain] = (onChainMcapByChain[chain] || 0) + value
			totalOnChainMcap += value
			if (selectedChain && rwaSlug(chain) === selectedChain) {
				hasSelectedChainInOnChainMcap = true
				filteredOnChainMcap += value
			}
		}
	}

	if (activeMcapBreakdown) {
		for (const chain in activeMcapBreakdown) {
			const value = safeNumber(activeMcapBreakdown[chain])
			activeMcapByChain[chain] = (activeMcapByChain[chain] || 0) + value
			totalActiveMcap += value
			if (selectedChain && rwaSlug(chain) === selectedChain) {
				hasSelectedChainInActiveMcap = true
				filteredActiveMcap += value
			}
		}
	}

	if (defiActiveTvlBreakdown) {
		for (const chain in defiActiveTvlBreakdown) {
			const isSelectedChain = !isChainFiltered || rwaSlug(chain) === selectedChain
			if (selectedChain && isSelectedChain) {
				hasSelectedChainInDeFiActiveTvl = true
			}

			let chainTotal = 0
			for (const protocolName in defiActiveTvlBreakdown[chain]) {
				const value = safeNumber(defiActiveTvlBreakdown[chain][protocolName])
				chainTotal += value
				defiActiveTvlByProtocol[protocolName] = (defiActiveTvlByProtocol[protocolName] || 0) + value
				totalDeFiActiveTvl += value

				if (isSelectedChain && selectedChain) {
					defiActiveTvlByProtocolFiltered[protocolName] = (defiActiveTvlByProtocolFiltered[protocolName] || 0) + value
					filteredDeFiActiveTvl += value
				}
			}

			if (chainTotal > 0) {
				defiActiveTvlByChain[chain] = (defiActiveTvlByChain[chain] || 0) + chainTotal
				if (isSelectedChain && selectedChain) {
					defiActiveTvlByChainFiltered[chain] = (defiActiveTvlByChainFiltered[chain] || 0) + chainTotal
				}
			}
		}
	}

	return {
		totals: {
			onChainMcap: totalOnChainMcap,
			activeMcap: totalActiveMcap,
			defiActiveTvl: totalDeFiActiveTvl
		},
		filteredTotals: {
			onChainMcap: filteredOnChainMcap,
			activeMcap: filteredActiveMcap,
			defiActiveTvl: filteredDeFiActiveTvl
		},
		hasSelectedChainData: {
			onChainMcap: hasSelectedChainInOnChainMcap,
			activeMcap: hasSelectedChainInActiveMcap,
			defiActiveTvl: hasSelectedChainInDeFiActiveTvl
		},
		breakdowns: {
			onChainMcapByChain,
			activeMcapByChain,
			defiActiveTvlByProtocol,
			defiActiveTvlByProtocolFiltered,
			defiActiveTvlByChain,
			defiActiveTvlByChainFiltered
		}
	}
}

type RWAAssetsOverviewParams = {
	chain?: string
	category?: string
	platform?: string
	assetGroup?: string
	rwaList: IRWAList
}

const ASSETS_TO_EXCLUDE = new Set([])

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

export async function getRWAAssetsOverview(params: RWAAssetsOverviewParams): Promise<IRWAAssetsOverview | null> {
	try {
		const selectedChain = params.chain ? rwaSlug(params.chain) : undefined
		const selectedCategory = params.category ? rwaSlug(params.category) : undefined
		const selectedPlatform = params.platform ? rwaSlug(params.platform) : undefined
		const selectedAssetGroup = params.assetGroup ? rwaSlug(params.assetGroup) : undefined

		const selectedCount =
			Number(!!selectedChain) + Number(!!selectedCategory) + Number(!!selectedPlatform) + Number(!!selectedAssetGroup)
		if (selectedCount > 1) return null

		const target: RWATickerChartTarget = selectedChain
			? { kind: 'chain', slug: selectedChain }
			: selectedCategory
				? { kind: 'category', slug: selectedCategory }
				: selectedPlatform
					? { kind: 'platform', slug: selectedPlatform }
					: selectedAssetGroup
						? { kind: 'assetGroup', slug: selectedAssetGroup }
						: { kind: 'all' }

		const [data, chartData]: [Array<IFetchedRWAProject>, IRWAChartDataByTicker | null] = await Promise.all([
			fetchRWAActiveTVLs(),
			fetchRWAChartDataByTicker(target)
		])

		assert(data, 'Failed to get RWA assets list')

		const chartDataMs: IRWAChartDataByTicker | null = chartData
			? {
					onChainMcap: ensureChronologicalRows(
						(chartData.onChainMcap ?? []).map((row) => ({ ...row, timestamp: toUnixMsTimestamp(row.timestamp) }))
					),
					activeMcap: ensureChronologicalRows(
						(chartData.activeMcap ?? []).map((row) => ({ ...row, timestamp: toUnixMsTimestamp(row.timestamp) }))
					),
					defiActiveTvl: ensureChronologicalRows(
						(chartData.defiActiveTvl ?? []).map((row) => ({ ...row, timestamp: toUnixMsTimestamp(row.timestamp) }))
					)
				}
			: null

		// `selectedChain` comes from the URL and is slugified; resolve a display name (original casing/spaces)
		// while still filtering breakdown keys by slug for robustness.
		let actualChainName: string | null = null
		if (selectedChain) {
			for (const item of data) {
				if (item.chain) {
					for (const c of item.chain) {
						if (rwaSlug(c) === selectedChain) {
							actualChainName = c
							break
						}
					}
				}
				if (actualChainName) break
			}
			if (!actualChainName) {
				return null
			}
		}

		// `selectedCategory` comes from the URL and is slugified; resolve a display name (original casing/spaces)
		let actualCategoryName: string | null = null
		if (selectedCategory) {
			for (const item of data) {
				if (item.category) {
					for (const c of item.category) {
						if (rwaSlug(c) === selectedCategory) {
							actualCategoryName = c
							break
						}
					}
				}
				if (actualCategoryName) break
			}
			if (!actualCategoryName) {
				return null
			}
		}

		let actualPlatformName: string | null = null
		if (selectedPlatform) {
			for (const item of data) {
				const platform = getRealRwaPlatforms(item.parentPlatform).find((value) => rwaSlug(value) === selectedPlatform)
				if (platform) {
					actualPlatformName = platform
					break
				}
			}
			if (!actualPlatformName) {
				return null
			}
		}

		let actualAssetGroupName: string | null = null
		if (selectedAssetGroup) {
			assert(params.rwaList.assetGroups, 'assetGroups not found in RWA list')
			for (const assetGroup of params.rwaList.assetGroups) {
				if (rwaSlug(assetGroup) === selectedAssetGroup) {
					actualAssetGroupName = assetGroup
					break
				}
			}
			if (!actualAssetGroupName) {
				return null
			}
		}

		const assets: Array<IRWAProject> = []
		const types = new Map<string, number>()
		const assetClasses = new Map<string, number>()
		const rwaClassifications = new Map<string, number>()
		const accessModels = new Map<string, number>()
		const categories = new Map<string, number>()
		const platforms = new Map<string, number>()
		const assetGroups = new Map<string, number>()
		const assetNames = new Map<string, number>()
		const issuers = new Map<string, number>()
		const issuerSet = new Set<string>()
		const issuerSetStablecoinsOnly = new Set<string>()
		const issuerSetGovernanceOnly = new Set<string>()
		const issuerSetStablecoinsAndGovernance = new Set<string>()
		let totalOnChainMcap = 0
		let totalActiveMcap = 0
		let totalDeFiActiveTvl = 0
		let totalOnChainMcapStablecoinsOnly = 0
		let totalActiveMcapStablecoinsOnly = 0
		let totalDeFiActiveTvlStablecoinsOnly = 0
		let totalOnChainMcapGovernanceOnly = 0
		let totalActiveMcapGovernanceOnly = 0
		let totalDeFiActiveTvlGovernanceOnly = 0
		let totalOnChainMcapStablecoinsAndGovernance = 0
		let totalActiveMcapStablecoinsAndGovernance = 0
		let totalDeFiActiveTvlStablecoinsAndGovernance = 0

		for (const item of data) {
			const onChainMcapBreakdown = isEmptyObject(item.onChainMcap) ? null : (item.onChainMcap ?? null)
			const activeMcapBreakdown = isEmptyObject(item.activeMcap) ? null : (item.activeMcap ?? null)
			const defiActiveTvlBreakdown = isEmptyObject(item.defiActiveTvl) ? null : (item.defiActiveTvl ?? null)
			const isChainFiltered = !!selectedChain
			const aggregatedMetrics = aggregateRwaMetrics({
				onChainMcapBreakdown,
				activeMcapBreakdown,
				defiActiveTvlBreakdown,
				selectedChain
			})
			const hasCategoryMatch = selectedCategory
				? (item.category ?? []).some((c) => c && rwaSlug(c) === selectedCategory)
				: true
			const hasPlatformMatch = selectedPlatform
				? getRealRwaPlatforms(item.parentPlatform).some((platform) => rwaSlug(platform) === selectedPlatform)
				: true
			const hasAssetGroupMatch = selectedAssetGroup
				? typeof item.assetGroup === 'string' && rwaSlug(item.assetGroup) === selectedAssetGroup
				: true

			// Check if asset has actual TVL on the selected chain (from TVL data, not just chain array)
			const hasChainInTvl = selectedChain
				? aggregatedMetrics.hasSelectedChainData.onChainMcap ||
					aggregatedMetrics.hasSelectedChainData.activeMcap ||
					aggregatedMetrics.hasSelectedChainData.defiActiveTvl
				: true

			// Use filtered values if chain is selected, otherwise use totals
			const effectiveOnChainMcap = selectedChain
				? aggregatedMetrics.filteredTotals.onChainMcap
				: aggregatedMetrics.totals.onChainMcap
			const effectiveActiveMcap = selectedChain
				? aggregatedMetrics.filteredTotals.activeMcap
				: aggregatedMetrics.totals.activeMcap
			const effectiveDeFiActiveTvl = selectedChain
				? aggregatedMetrics.filteredTotals.defiActiveTvl
				: aggregatedMetrics.totals.defiActiveTvl

			const isTrueRWA = item.rwaClassification === 'True RWA'
			const sortedCategories =
				selectedCategory && Array.isArray(item.category)
					? [
							...item.category.filter((c) => c && rwaSlug(c) === selectedCategory),
							...item.category.filter((c) => c && rwaSlug(c) !== selectedCategory)
						]
					: (item.category ?? null)
			const asset: IRWAProject = {
				...item,
				rwaClassification: isTrueRWA ? 'RWA' : (item.rwaClassification ?? null),
				trueRWA: isTrueRWA,
				category: sortedCategories,
				onChainMcap: onChainMcapBreakdown
					? {
							total: effectiveOnChainMcap,
							breakdown: Object.entries(aggregatedMetrics.breakdowns.onChainMcapByChain)
								.filter(([chain]) => !selectedChain || rwaSlug(chain) === selectedChain)
								.sort((a, b) => b[1] - a[1])
						}
					: null,
				activeMcap: activeMcapBreakdown
					? {
							total: effectiveActiveMcap,
							breakdown: Object.entries(aggregatedMetrics.breakdowns.activeMcapByChain)
								.filter(([chain]) => !selectedChain || rwaSlug(chain) === selectedChain)
								.sort((a, b) => b[1] - a[1])
						}
					: null,
				defiActiveTvl: defiActiveTvlBreakdown
					? {
							total: effectiveDeFiActiveTvl,
							breakdown: Object.entries(
								isChainFiltered
									? aggregatedMetrics.breakdowns.defiActiveTvlByProtocolFiltered
									: aggregatedMetrics.breakdowns.defiActiveTvlByProtocol
							).sort((a, b) => b[1] - a[1])
						}
					: {
							total: 0,
							breakdown: []
						},
				defiActiveTvlByChain: defiActiveTvlBreakdown
					? {
							total: effectiveDeFiActiveTvl,
							breakdown: Object.entries(
								isChainFiltered
									? aggregatedMetrics.breakdowns.defiActiveTvlByChainFiltered
									: aggregatedMetrics.breakdowns.defiActiveTvlByChain
							).sort((a, b) => b[1] - a[1])
						}
					: null
			}

			// Only include asset if it exists on the selected chain/category (or no route filter)
			if (
				hasChainInTvl &&
				hasCategoryMatch &&
				hasPlatformMatch &&
				hasAssetGroupMatch &&
				asset.assetName &&
				!ASSETS_TO_EXCLUDE.has(asset.assetName)
			) {
				const isStablecoin = !!item.stablecoin
				const isGovernance = !!item.governance
				const isStablecoinOnly = isStablecoin && !isGovernance
				const isGovernanceOnly = isGovernance && !isStablecoin
				const isStablecoinAndGovernance = isStablecoin && isGovernance
				const isBaseAsset = !isStablecoin && !isGovernance

				assets.push(asset)
				// Only expose `assetNames` when filtering by platform (used for platform-level UI filters).
				if (selectedPlatform) {
					assetNames.set(asset.assetName, (assetNames.get(asset.assetName) ?? 0) + effectiveOnChainMcap)
				}

				// Track base totals (exclude stablecoin/governance buckets entirely)
				if (isBaseAsset) {
					totalOnChainMcap += effectiveOnChainMcap
					totalActiveMcap += effectiveActiveMcap
					totalDeFiActiveTvl += effectiveDeFiActiveTvl
				}

				if (isStablecoinOnly) {
					totalOnChainMcapStablecoinsOnly += effectiveOnChainMcap
					totalActiveMcapStablecoinsOnly += effectiveActiveMcap
					totalDeFiActiveTvlStablecoinsOnly += effectiveDeFiActiveTvl
				} else if (isGovernanceOnly) {
					totalOnChainMcapGovernanceOnly += effectiveOnChainMcap
					totalActiveMcapGovernanceOnly += effectiveActiveMcap
					totalDeFiActiveTvlGovernanceOnly += effectiveDeFiActiveTvl
				} else if (isStablecoinAndGovernance) {
					totalOnChainMcapStablecoinsAndGovernance += effectiveOnChainMcap
					totalActiveMcapStablecoinsAndGovernance += effectiveActiveMcap
					totalDeFiActiveTvlStablecoinsAndGovernance += effectiveDeFiActiveTvl
				}

				// Add to categories/issuers/assetClasses/rwaClassifications/accessModels for assets on this chain
				if (asset.type) {
					types.set(asset.type, (types.get(asset.type) ?? 0) + effectiveOnChainMcap)
				}
				for (const assetClass of asset.assetClass ?? []) {
					if (assetClass) {
						assetClasses.set(assetClass, (assetClasses.get(assetClass) ?? 0) + effectiveOnChainMcap)
					}
				}
				for (const category of asset.category ?? []) {
					if (category) {
						categories.set(category, (categories.get(category) ?? 0) + effectiveOnChainMcap)
					}
				}
				for (const platform of getRwaPlatforms(asset.parentPlatform)) {
					if (platform === UNKNOWN_PLATFORM) continue
					platforms.set(platform, (platforms.get(platform) ?? 0) + effectiveOnChainMcap)
				}
				if (typeof asset.assetGroup === 'string') {
					assetGroups.set(asset.assetGroup, (assetGroups.get(asset.assetGroup) ?? 0) + effectiveOnChainMcap)
				}
				if (asset.rwaClassification) {
					rwaClassifications.set(
						asset.rwaClassification,
						(rwaClassifications.get(asset.rwaClassification) ?? 0) + effectiveOnChainMcap
					)
				}
				if (asset.accessModel) {
					accessModels.set(asset.accessModel, (accessModels.get(asset.accessModel) ?? 0) + effectiveOnChainMcap)
				}
				if (asset.issuer) {
					// issuerSet is used for *base* issuer count (exclude stablecoin/governance buckets)
					if (isBaseAsset) {
						issuerSet.add(asset.issuer)
					} else if (isStablecoinOnly) {
						issuerSetStablecoinsOnly.add(asset.issuer)
					} else if (isGovernanceOnly) {
						issuerSetGovernanceOnly.add(asset.issuer)
					} else if (isStablecoinAndGovernance) {
						issuerSetStablecoinsAndGovernance.add(asset.issuer)
					}
					issuers.set(asset.issuer, (issuers.get(asset.issuer) ?? 0) + effectiveOnChainMcap)
				}
			}
		}

		const formattedRwaClassifications = Array.from(rwaClassifications.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		const formattedAccessModels = Array.from(accessModels.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		const formattedTypes = Array.from(types.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		const formattedAssetClasses = Array.from(assetClasses.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		const formattedCategories = Array.from(categories.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)
		const formattedPlatforms = Array.from(platforms.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)
		const formattedAssetGroups = Array.from(assetGroups.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		const chainNavValues = params.rwaList.chains.map((chain) => ({
			label: chain,
			to: `/rwa/chain/${rwaSlug(chain)}`
		}))
		const categoryNavValues = params.rwaList.categories.map((category) => ({
			label: category,
			to: `/rwa/category/${rwaSlug(category)}`
		}))
		const platformNavValues = params.rwaList.platforms.map((platform) => ({
			label: platform,
			to: `/rwa/platform/${rwaSlug(platform)}`
		}))
		const assetGroupNavValues = params.rwaList.assetGroups.map((assetGroup) => ({
			label: assetGroup,
			to: `/rwa/asset-group/${rwaSlug(assetGroup)}`
		}))

		assert(chainNavValues?.length, 'chains not found in RWA list')
		assert(categoryNavValues?.length, 'categories not found in RWA list')
		assert(platformNavValues?.length, 'platforms not found in RWA list')
		assert(assetGroupNavValues?.length, 'assetGroups not found in RWA list')

		// Pre-aggregate chart data server-side so we don't ship the huge ticker-level payload to the client.
		const isChainMode = !selectedCategory && !selectedPlatform && !selectedAssetGroup
		const aggregationMode: RWAChartAggregationMode = selectedAssetGroup ? 'assetName' : 'assetGroup'
		const defaultFilteredAssets = applyDefaultAssetFilters(assets, {
			includeStablecoins: !isChainMode,
			includeGovernance: !isChainMode,
			mode: selectedAssetGroup ? 'assetGroup' : selectedPlatform ? 'platform' : selectedCategory ? 'category' : 'chain',
			categorySlug: selectedCategory
		})
		const initialChartDataset = chartDataMs
			? {
					onChainMcap: emptyChartDataset(),
					activeMcap: aggregateRwaMetricData(defaultFilteredAssets, chartDataMs.activeMcap, aggregationMode),
					defiActiveTvl: emptyChartDataset()
				}
			: null

		return {
			assets: assets.sort((a, b) => (b.onChainMcap?.total ?? 0) - (a.onChainMcap?.total ?? 0)),
			types: formattedTypes,
			typeOptions: formattedTypes.map((type) => ({
				key: type,
				name: type,
				help: definitions.type.values?.[type] ?? null
			})),
			assetClasses: formattedAssetClasses,
			assetClassOptions: formattedAssetClasses.map((assetClass) => ({
				key: assetClass,
				name: assetClass,
				help: definitions.assetClass.values?.[assetClass] ?? null
			})),
			rwaClassifications: formattedRwaClassifications,
			rwaClassificationOptions: formattedRwaClassifications.map((classification) => ({
				key: classification,
				name: classification,
				help: definitions.rwaClassification.values?.[classification] ?? null
			})),
			accessModels: formattedAccessModels,
			accessModelOptions: formattedAccessModels.map((accessModel) => ({
				key: accessModel,
				name: accessModel,
				help: definitions.accessModel.values?.[accessModel] ?? null
			})),
			categories: formattedCategories,
			categoriesOptions: formattedCategories.map((category) => ({
				key: category,
				name: category,
				help: definitions.category.values?.[category] ?? null
			})),
			platforms: formattedPlatforms,
			assetGroups: formattedAssetGroups,
			assetNames: selectedPlatform
				? Array.from(assetNames.entries())
						.sort((a, b) => b[1] - a[1])
						.map(([key]) => key)
				: [],
			categoryValues: Array.from(categories.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([name, value]) => ({ name, value })),
			issuers: Array.from(issuers.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([key]) => key),
			selectedChain: actualChainName ?? 'All',
			chainLinks:
				selectedCategory || selectedPlatform || selectedAssetGroup
					? []
					: [{ label: 'All', to: '/rwa' }, ...chainNavValues],
			categoryLinks: selectedCategory ? [{ label: 'All', to: '/rwa/categories' }, ...categoryNavValues] : [],
			selectedCategory: actualCategoryName ?? 'All',
			platformLinks: selectedPlatform ? [{ label: 'All', to: '/rwa/platforms' }, ...platformNavValues] : [],
			selectedPlatform: actualPlatformName ?? 'All',
			assetGroupLinks: selectedAssetGroup ? [{ label: 'All', to: '/rwa/asset-groups' }, ...assetGroupNavValues] : [],
			selectedAssetGroup: actualAssetGroupName ?? 'All',
			totals: {
				onChainMcap: totalOnChainMcap,
				activeMcap: totalActiveMcap,
				defiActiveTvl: totalDeFiActiveTvl,
				issuers: Array.from(issuerSet),
				stablecoins: {
					onChainMcap: totalOnChainMcapStablecoinsOnly,
					activeMcap: totalActiveMcapStablecoinsOnly,
					defiActiveTvl: totalDeFiActiveTvlStablecoinsOnly,
					issuers: Array.from(issuerSetStablecoinsOnly)
				},
				governance: {
					onChainMcap: totalOnChainMcapGovernanceOnly,
					activeMcap: totalActiveMcapGovernanceOnly,
					defiActiveTvl: totalDeFiActiveTvlGovernanceOnly,
					issuers: Array.from(issuerSetGovernanceOnly)
				},
				stablecoinsAndGovernance: {
					onChainMcap: totalOnChainMcapStablecoinsAndGovernance,
					activeMcap: totalActiveMcapStablecoinsAndGovernance,
					defiActiveTvl: totalDeFiActiveTvlStablecoinsAndGovernance,
					issuers: Array.from(issuerSetStablecoinsAndGovernance)
				}
			},
			initialChartDataset,
			chainSlug: selectedChain ?? null,
			categorySlug: selectedCategory ?? null,
			platformSlug: selectedPlatform ?? null,
			assetGroupSlug: selectedAssetGroup ?? null
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA assets overview')
	}
}

export async function getRWAChainsOverview(): Promise<IRWAChainsOverview> {
	const [data, activeMcapRows] = await Promise.all([
		fetchRWAStats(),
		fetchRWAChainBreakdownChartData({ key: 'activeMcap' })
	])

	if (!data?.byChain) {
		throw new Error('Failed to get RWA stats')
	}

	const rows: IRWAChainsOverviewRow[] = []
	for (const chain in data.byChain) {
		const stats = data.byChain[chain]

		rows.push({
			...stats,
			chain
		})
	}

	return {
		rows: rows.sort((a, b) => (b.base?.onChainMcap ?? 0) - (a.base?.onChainMcap ?? 0)),
		initialChartDataset: toBreakdownChartDataset(activeMcapRows)
	}
}

export async function getRWACategoriesOverview(): Promise<IRWACategoriesOverview> {
	const [data, activeMcapRows] = await Promise.all([
		fetchRWAStats(),
		fetchRWACategoryBreakdownChartData({ key: 'activeMcap', includeStablecoin: true, includeGovernance: true })
	])

	if (!data?.byCategory) {
		throw new Error('Failed to get RWA stats')
	}

	const rows: IRWACategoriesOverviewRow[] = []
	for (const category in data.byCategory) {
		const stats = data.byCategory[category]
		const buckets = [stats.base, stats.stablecoinsOnly, stats.governanceOnly, stats.stablecoinsAndGovernance]
		let onChainMcap = 0
		let activeMcap = 0
		let defiActiveTvl = 0
		let assetCount = 0
		const issuerSet = new Set<string>()
		for (const b of buckets) {
			onChainMcap += b.onChainMcap
			activeMcap += b.activeMcap
			defiActiveTvl += b.defiActiveTvl
			assetCount += b.assetCount
			for (const issuer of b.assetIssuers) issuerSet.add(issuer)
		}
		rows.push({
			category,
			onChainMcap,
			activeMcap,
			defiActiveTvl,
			assetCount,
			assetIssuers: issuerSet.size
		})
	}

	return {
		rows: rows.sort((a, b) => b.onChainMcap - a.onChainMcap),
		initialChartDataset: toBreakdownChartDataset(activeMcapRows)
	}
}

export async function getRWAPlatformsOverview(): Promise<IRWAPlatformsOverview> {
	const [data, activeMcapRows] = await Promise.all([
		fetchRWAStats(),
		fetchRWAPlatformBreakdownChartData({ key: 'activeMcap', includeStablecoin: true, includeGovernance: true })
	])

	if (!data?.byPlatform) {
		throw new Error('Failed to get RWA stats')
	}

	const rows: IRWAPlatformsOverviewRow[] = []
	for (const platform in data.byPlatform) {
		const stats = data.byPlatform[platform]
		const buckets = [stats.base, stats.stablecoinsOnly, stats.governanceOnly, stats.stablecoinsAndGovernance]
		let onChainMcap = 0
		let activeMcap = 0
		let defiActiveTvl = 0
		let assetCount = 0
		for (const b of buckets) {
			onChainMcap += b.onChainMcap
			activeMcap += b.activeMcap
			defiActiveTvl += b.defiActiveTvl
			assetCount += b.assetCount
		}
		rows.push({
			platform,
			onChainMcap,
			activeMcap,
			defiActiveTvl,
			assetCount
		})
	}

	return {
		rows: rows.sort((a, b) => b.onChainMcap - a.onChainMcap),
		initialChartDataset: toBreakdownChartDataset(activeMcapRows)
	}
}

export async function getRWAAssetGroupsOverview(): Promise<IRWAAssetGroupsOverview> {
	const [data, activeMcapRows] = await Promise.all([
		fetchRWAStats(),
		fetchRWAAssetGroupBreakdownChartData({ key: 'activeMcap', includeStablecoin: true, includeGovernance: true })
	])

	if (!data?.byAssetGroup) {
		throw new Error('Failed to get RWA stats')
	}

	const rows: IRWAAssetGroupsOverviewRow[] = []
	for (const assetGroup in data.byAssetGroup) {
		const stats = data.byAssetGroup[assetGroup]
		const buckets = [stats.base, stats.stablecoinsOnly, stats.governanceOnly, stats.stablecoinsAndGovernance]
		let onChainMcap = 0
		let activeMcap = 0
		let defiActiveTvl = 0
		let assetCount = 0
		for (const b of buckets) {
			onChainMcap += b.onChainMcap
			activeMcap += b.activeMcap
			defiActiveTvl += b.defiActiveTvl
			assetCount += b.assetCount
		}
		rows.push({
			assetGroup,
			onChainMcap,
			activeMcap,
			defiActiveTvl,
			assetCount
		})
	}

	return {
		rows: rows.sort((a, b) => b.onChainMcap - a.onChainMcap),
		initialChartDataset: toBreakdownChartDataset(activeMcapRows)
	}
}

export async function getRWAAssetData({ assetId }: { assetId: string }): Promise<IRWAAssetData | null> {
	try {
		const [data, chartDataset, blockExplorersData]: [
			IFetchedRWAProject,
			IRWAAssetData['chartDataset'],
			Awaited<ReturnType<typeof fetchBlockExplorers>>
		] = await Promise.all([
			fetchRWAAssetDataById(assetId),
			fetchRWAAssetChartData(assetId),
			fetchBlockExplorers().catch(() => [])
		])

		if (!data) {
			throw new Error('Failed to get RWA assets list')
		}

		const onChainMcapBreakdown = isEmptyObject(data.onChainMcap) ? null : (data.onChainMcap ?? null)
		const activeMcapBreakdown = isEmptyObject(data.activeMcap) ? null : (data.activeMcap ?? null)
		const defiActiveTvlBreakdown = isEmptyObject(data.defiActiveTvl) ? null : (data.defiActiveTvl ?? null)
		const aggregatedMetrics = aggregateRwaMetrics({
			onChainMcapBreakdown,
			activeMcapBreakdown,
			defiActiveTvlBreakdown
		})

		const isTrueRWA = data.rwaClassification === 'True RWA'
		// Get the classification description - use True RWA definition if trueRWA flag
		const classificationKey = isTrueRWA ? 'True RWA' : data.rwaClassification
		const rwaClassificationDescription = classificationKey
			? (definitions.rwaClassification.values?.[classificationKey] ?? null)
			: null

		const accessModelDescription = data.accessModel
			? (definitions.accessModel.values?.[data.accessModel] ?? null)
			: null
		// Get asset class descriptions
		const assetClassDescriptions: Record<string, string> = {}
		for (const ac of data.assetClass ?? []) {
			const description = ac ? definitions.assetClass.values?.[ac] : null
			if (description) {
				assetClassDescriptions[ac] = description
			}
		}

		let contractUrls: Record<string, Record<string, string>> | null = null
		if (data.contracts) {
			contractUrls = {}
			for (const chain in data.contracts) {
				const addresses = data.contracts[chain]
				if (!addresses) continue
				for (const address of addresses) {
					const result = getBlockExplorerNew({
						apiResponse: blockExplorersData,
						address,
						chainName: chain,
						urlType: 'token'
					})
					if (result) {
						contractUrls[chain] ??= {}
						contractUrls[chain][address] = result.url
					}
				}
			}
		}

		if (chartDataset && data.activeMcapData === false) {
			chartDataset.dimensions = chartDataset.dimensions.filter((dimension) => dimension !== 'Active Mcap')
		}

		return {
			...data,
			slug: rwaSlug(data.ticker),
			trueRWA: isTrueRWA,
			rwaClassification: isTrueRWA ? 'RWA' : (data.rwaClassification ?? null),
			rwaClassificationDescription,
			accessModelDescription,
			assetClassDescriptions,
			contractUrls,
			onChainMcap: onChainMcapBreakdown
				? {
						total: aggregatedMetrics.totals.onChainMcap,
						breakdown: Object.entries(aggregatedMetrics.breakdowns.onChainMcapByChain).sort((a, b) => b[1] - a[1])
					}
				: null,
			activeMcap: activeMcapBreakdown
				? {
						total: aggregatedMetrics.totals.activeMcap,
						breakdown: Object.entries(aggregatedMetrics.breakdowns.activeMcapByChain).sort((a, b) => b[1] - a[1])
					}
				: null,
			defiActiveTvl: defiActiveTvlBreakdown
				? {
						total: aggregatedMetrics.totals.defiActiveTvl,
						breakdown: Object.entries(aggregatedMetrics.breakdowns.defiActiveTvlByProtocol).sort((a, b) => b[1] - a[1])
					}
				: null,
			chartDataset
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA asset data')
	}
}

function safeNumber(value: unknown): number {
	const n = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(n) ? n : 0
}

function isEmptyObject(value: unknown): boolean {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false
	for (const _key in value) return false
	return true
}
