import { ensureChronologicalRows } from '~/components/ECharts/utils'
import definitions from '~/public/rwa-definitions.json'
import type { IRWAList } from '~/utils/metadata/types'
import { getRWAActiveTVLs, getRWAStats, getRWAChartDataByTicker, getRWAAssetDataById, getRWAAssetChartData } from './api'
import type {
	IFetchedRWAProject,
	IRWAChartDataByTicker,
	IRWAProject,
	IRWAAssetsOverview,
	IRWAAssetData,
	IRWAChainsOverviewRow,
	IRWACategoriesOverviewRow,
	IRWAPlatformsOverviewRow
} from './api.types'
import { rwaSlug } from './rwaSlug'

function toUnixMsTimestamp(ts: number): number {
	// API timestamps are historically in unix seconds. Normalize to ms for ECharts time axis.
	// Keep this tolerant to already-ms values to avoid double conversion.
	return Number.isFinite(ts) && ts > 0 && ts < 1e12 ? ts * 1e3 : ts
}

type ChainMetricBreakdown = Record<string, string> | null
type DefiMetricBreakdown = Record<string, Record<string, string>> | null

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

export type RWAAssetsOverviewParams = {
	chain?: string
	category?: string
	platform?: string
	rwaList: IRWAList
}

export async function getRWAAssetsOverview(params?: RWAAssetsOverviewParams): Promise<IRWAAssetsOverview | null> {
	try {
		const selectedChain = params?.chain ? rwaSlug(params.chain) : undefined
		const selectedCategory = params?.category ? rwaSlug(params.category) : undefined
		const selectedPlatform = params?.platform ? rwaSlug(params.platform) : undefined

		// Route-level filtering supports chain OR category OR platform, not multiple at once.
		const selectedCount = Number(!!selectedChain) + Number(!!selectedCategory) + Number(!!selectedPlatform)
		if (selectedCount > 1) return null

		const [data, chartData]: [Array<IFetchedRWAProject>, IRWAChartDataByTicker | null] = await Promise.all([
			getRWAActiveTVLs(),
			getRWAChartDataByTicker({ selectedChain, selectedCategory, selectedPlatform })
		])

		if (!data) {
			throw new Error('Failed to get RWA assets list')
		}

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
			for (const rwaId in data) {
				const match = data[rwaId].chain?.find((c) => rwaSlug(c) === selectedChain)
				if (match) {
					actualChainName = match
					break
				}
			}
			if (!actualChainName) {
				return null
			}
		}

		// `selectedCategory` comes from the URL and is slugified; resolve a display name (original casing/spaces)
		let actualCategoryName: string | null = null
		if (selectedCategory) {
			for (const rwaId in data) {
				const match = data[rwaId].category?.find((c) => rwaSlug(c) === selectedCategory)
				if (match) {
					actualCategoryName = match
					break
				}
			}
			if (!actualCategoryName) {
				return null
			}
		}

		// `selectedPlatform` comes from the URL and is slugified; resolve a display name (original casing/spaces)
		let actualPlatformName: string | null = null
		if (selectedPlatform) {
			for (const rwaId in data) {
				const platform = data[rwaId].parentPlatform
				if (platform && rwaSlug(platform) === selectedPlatform) {
					actualPlatformName = platform
					break
				}
			}
			if (!actualPlatformName) {
				return null
			}
		}

		const assets: Array<IRWAProject> = []
		const types = new Map<string, number>()
		const assetClasses = new Map<string, number>()
		const rwaClassifications = new Map<string, number>()
		const accessModels = new Map<string, number>()
		const categories = new Map<string, number>()
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
				? !!item.parentPlatform && rwaSlug(item.parentPlatform) === selectedPlatform
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
			if (hasChainInTvl && hasCategoryMatch && hasPlatformMatch && asset.assetName) {
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

		const chainNavValues =
			params?.rwaList?.chains?.map((chain) => ({
				label: chain,
				to: `/rwa/chain/${rwaSlug(chain)}`
			})) ?? []
		const categoryNavValues =
			params?.rwaList?.categories?.map((category) => ({
				label: category,
				to: `/rwa/category/${rwaSlug(category)}`
			})) ?? []
		const platformNavValues =
			params?.rwaList?.platforms?.map((platform) => ({
				label: platform,
				to: `/rwa/platform/${rwaSlug(platform)}`
			})) ?? []

		if ((selectedChain && !chainNavValues) || chainNavValues.length === 0) {
			throw new Error('chains not found in RWA list')
		}

		if ((selectedCategory && !categoryNavValues) || categoryNavValues.length === 0) {
			throw new Error('categories not found in RWA list')
		}

		if ((selectedPlatform && !platformNavValues) || platformNavValues.length === 0) {
			throw new Error('platforms not found in RWA list')
		}

		return {
			assets: assets.sort((a, b) => (b.onChainMcap?.total ?? 0) - (a.onChainMcap?.total ?? 0)),
			types: formattedTypes,
		typeOptions: formattedTypes.map((type) => ({
			key: type,
			name: type,
			help: (definitions.type.values as Record<string, string>)?.[type] ?? null
		})),
			assetClasses: formattedAssetClasses,
		assetClassOptions: formattedAssetClasses.map((assetClass) => ({
			key: assetClass,
			name: assetClass,
			help: (definitions.assetClass.values as Record<string, string>)?.[assetClass] ?? null
		})),
			rwaClassifications: formattedRwaClassifications,
		rwaClassificationOptions: formattedRwaClassifications.map((classification) => ({
			key: classification,
			name: classification,
			help: (definitions.rwaClassification.values as Record<string, string>)?.[classification] ?? null
		})),
			accessModels: formattedAccessModels,
		accessModelOptions: formattedAccessModels.map((accessModel) => ({
			key: accessModel,
			name: accessModel,
			help: (definitions.accessModel.values as Record<string, string>)?.[accessModel] ?? null
		})),
			categories: formattedCategories,
		categoriesOptions: formattedCategories.map((category) => ({
			key: category,
			name: category,
			help: (definitions.category.values as Record<string, string>)?.[category] ?? null
		})),
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
			chainLinks: selectedCategory || selectedPlatform ? [] : [{ label: 'All', to: '/rwa' }, ...chainNavValues],
			categoryLinks: selectedCategory ? [{ label: 'All', to: '/rwa/categories' }, ...categoryNavValues] : [],
			selectedCategory: actualCategoryName ?? 'All',
			platformLinks: selectedPlatform ? [{ label: 'All', to: '/rwa/platforms' }, ...platformNavValues] : [],
			selectedPlatform: actualPlatformName ?? 'All',
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
			chartData: chartDataMs
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA assets overview')
	}
}

export async function getRWAChainsOverview(): Promise<IRWAChainsOverviewRow[]> {
	const data = await getRWAStats()
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

	return rows.sort((a, b) => (b.base?.onChainMcap ?? 0) - (a.base?.onChainMcap ?? 0))
}

export async function getRWACategoriesOverview(): Promise<IRWACategoriesOverviewRow[]> {
	const data = await getRWAStats()
	if (!data?.byCategory) {
		throw new Error('Failed to get RWA stats')
	}

	const rows: IRWACategoriesOverviewRow[] = []
	for (const category in data.byCategory) {
		const stats = data.byCategory[category]

		rows.push({
			...stats,
			category
		})
	}

	return rows.sort((a, b) => b.onChainMcap - a.onChainMcap)
}

export async function getRWAPlatformsOverview(): Promise<IRWAPlatformsOverviewRow[]> {
	const data = await getRWAStats()
	if (!data?.byPlatform) {
		throw new Error('Failed to get RWA stats')
	}

	const rows: IRWAPlatformsOverviewRow[] = []
	for (const platform in data.byPlatform) {
		const stats = data.byPlatform[platform]

		rows.push({
			...stats,
			platform
		})
	}

	return rows.sort((a, b) => b.onChainMcap - a.onChainMcap)
}

export type { IRWAAssetData }

export async function getRWAAssetData({ assetId }: { assetId: string }): Promise<IRWAAssetData | null> {
	try {
		const [data, chartDataset]: [IFetchedRWAProject, IRWAAssetData['chartDataset']] = await Promise.all([
			getRWAAssetDataById(assetId),
			getRWAAssetChartData(assetId)
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
			? ((definitions.rwaClassification.values as Record<string, string>)?.[classificationKey] ?? null)
			: null

		const accessModelDescription = data.accessModel
			? (definitions.accessModel.values as Record<string, string>)?.[data.accessModel] ?? null
			: null
		// Get asset class descriptions
		const assetClassDescriptions: Record<string, string> = {}
		for (const ac of data.assetClass ?? []) {
			const description = ac ? (definitions.assetClass.values as Record<string, string>)?.[ac] : null
			if (description) {
				assetClassDescriptions[ac] = description
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
	return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0
}
