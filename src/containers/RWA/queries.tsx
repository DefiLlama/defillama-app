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
	fetchRWAChartDataByAsset,
	fetchRWAAssetDataById,
	fetchRWAAssetChartData,
	toUnixMsTimestamp
} from './api'
import type {
	IFetchedRWAProject,
	IRWAChartDataByAsset,
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
	RWAPerpsOverviewAsset,
	RWASpotOverviewAsset,
	RWAAssetChartTarget
} from './api.types'
import { UNKNOWN_RWA_ASSET_GROUP, appendUnknownRwaAssetGroup, normalizeRwaAssetGroup } from './assetGroup'
import { toBreakdownChartDataset } from './breakdownDataset'
import {
	aggregateRwaMetricData,
	appendRwaChartDatasetTotal,
	applyDefaultAssetFilters,
	buildRwaOpenInterestDataset,
	type RWAChartAggregationMode
} from './chartAggregation'
import {
	filterCategoriesForStandardRwaOverview,
	getDefaultRWAOverviewInclusion,
	isCategoryIncludedInStandardRwaOverview,
	type RWAOverviewMode
} from './constants'
import { definitions } from './definitions'
import { getPrimaryRwaCategory, getRwaPlatforms, UNKNOWN_PLATFORM } from './grouping'
import { fetchRWAPerpsContractBreakdownChartData, fetchRWAPerpsCurrent } from './Perps/api'
import type { IRWAPerpsBreakdownChartResponse, IRWAPerpsMarket } from './Perps/api.types'
import { toRWAPerpsBreakdownChartDataset } from './Perps/breakdownDataset'
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

		const target: RWAAssetChartTarget = selectedChain
			? { kind: 'chain', slug: selectedChain }
			: selectedCategory
				? { kind: 'category', slug: selectedCategory }
				: selectedPlatform
					? { kind: 'platform', slug: selectedPlatform }
					: selectedAssetGroup
						? { kind: 'assetGroup', slug: selectedAssetGroup }
						: { kind: 'all' }
		const mode: RWAOverviewMode = selectedAssetGroup
			? 'assetGroup'
			: selectedPlatform
				? 'platform'
				: selectedCategory
					? 'category'
					: 'chain'
		const defaultInclusion = getDefaultRWAOverviewInclusion(mode, selectedCategory ?? null)

		const [data, perpsMarkets, chartData, openInterestChartRows]: [
			Array<IFetchedRWAProject>,
			IRWAPerpsMarket[],
			IRWAChartDataByAsset | null,
			IRWAPerpsBreakdownChartResponse | null
		] = await Promise.all([
			fetchRWAActiveTVLs(),
			fetchRWAPerpsCurrent(),
			fetchRWAChartDataByAsset({
				target,
				includeStablecoins: defaultInclusion.includeStablecoins,
				includeGovernance: defaultInclusion.includeGovernance
			}),
			selectedChain ? Promise.resolve(null) : fetchRWAPerpsContractBreakdownChartData({ key: 'openInterest' })
		])

		assert(data, 'Failed to get RWA assets list')
		assert(perpsMarkets, 'Failed to get RWA perps markets')
		const filteredData = data.filter(
			(item) => !(item.category ?? []).some((category) => !isCategoryIncludedInStandardRwaOverview(category))
		)
		const filteredPerpsMarkets = perpsMarkets.map((market) => ({
			...market,
			category: (market.category ?? []).filter((category) => isCategoryIncludedInStandardRwaOverview(category))
		}))
		const hasUnknownAssetGroup = filteredData.some(
			(item) => normalizeRwaAssetGroup(item.assetGroup) === UNKNOWN_RWA_ASSET_GROUP
		)
		// Only expose the synthetic Unknown filter/route when the current dataset actually contains
		// assets without an assetGroup value.
		const assetGroupValues = hasUnknownAssetGroup
			? appendUnknownRwaAssetGroup(params.rwaList.assetGroups)
			: params.rwaList.assetGroups

		const chartDataMs: IRWAChartDataByAsset | null = chartData
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
			for (const item of filteredData) {
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
			for (const category of filterCategoriesForStandardRwaOverview(params.rwaList.categories)) {
				if (rwaSlug(category) === selectedCategory) {
					actualCategoryName = category
					break
				}
			}
			if (!actualCategoryName) {
				return null
			}
		}

		let actualPlatformName: string | null = null
		if (selectedPlatform) {
			for (const platform of params.rwaList.platforms) {
				if (rwaSlug(platform) === selectedPlatform) {
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
			// Resolve the display label from the same set of filterable values used by the overview,
			// including the synthetic Unknown bucket when missing assetGroup values exist in the API data.
			for (const assetGroup of assetGroupValues) {
				const normalizedAssetGroup = normalizeRwaAssetGroup(assetGroup)
				if (rwaSlug(normalizedAssetGroup) === selectedAssetGroup) {
					actualAssetGroupName = normalizedAssetGroup
					break
				}
			}
			if (!actualAssetGroupName) {
				return null
			}
		}

		const assets: IRWAAssetsOverview['assets'] = []
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

		for (const item of filteredData) {
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
				? // Match missing/blank asset groups through the same normalized Unknown bucket used in the filters.
					rwaSlug(normalizeRwaAssetGroup(item.assetGroup)) === selectedAssetGroup
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
			const asset: RWASpotOverviewAsset = {
				id: item.id,
				kind: 'spot',
				detailHref: item.canonicalMarketId ? `/rwa/asset/${encodeURIComponent(item.canonicalMarketId)}` : '',
				canonicalMarketId: item.canonicalMarketId ?? '',
				assetName: item.assetName ?? '',
				ticker: item.ticker,
				primaryChain: item.primaryChain ?? null,
				chain: item.chain ?? null,
				price: item.price ?? null,
				openInterest: null,
				volume24h: null,
				volume30d: null,
				assetGroup: item.assetGroup ?? null,
				parentPlatform: item.parentPlatform ?? null,
				category: sortedCategories,
				assetClass: item.assetClass ?? null,
				accessModel: item.accessModel ?? null,
				type: item.type ?? null,
				rwaClassification: isTrueRWA ? 'RWA' : (item.rwaClassification ?? null),
				issuer: item.issuer ?? null,
				redeemable: item.redeemable ?? null,
				attestations: item.attestations ?? null,
				cexListed: item.cexListed ?? null,
				kycForMintRedeem: item.kycForMintRedeem ?? null,
				kycAllowlistedWhitelistedToTransferHold: item.kycAllowlistedWhitelistedToTransferHold ?? null,
				transferable: item.transferable ?? null,
				selfCustody: item.selfCustody ?? null,
				stablecoin: item.stablecoin ?? null,
				governance: item.governance ?? null,
				trueRWA: isTrueRWA,
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
				const primaryCategory = getPrimaryRwaCategory(asset.category)
				if (primaryCategory) {
					categories.set(primaryCategory, (categories.get(primaryCategory) ?? 0) + effectiveOnChainMcap)
				}
				for (const platform of getRwaPlatforms(asset.parentPlatform)) {
					if (platform === UNKNOWN_PLATFORM) continue
					platforms.set(platform, (platforms.get(platform) ?? 0) + effectiveOnChainMcap)
				}
				// Preserve assets with blank assetGroup values by assigning them to the normalized Unknown bucket.
				const assetGroup = normalizeRwaAssetGroup(asset.assetGroup)
				assetGroups.set(assetGroup, (assetGroups.get(assetGroup) ?? 0) + effectiveOnChainMcap)
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

		for (const market of filteredPerpsMarkets) {
			if (selectedChain) {
				continue
			}

			const asset: RWAPerpsOverviewAsset = {
				id: market.id,
				kind: 'perps',
				detailHref: `/rwa/perps/contract/${encodeURIComponent(market.contract)}`,
				contract: market.contract,
				assetName: market.referenceAsset ?? market.contract,
				ticker: market.contract,
				primaryChain: null,
				chain: null,
				price: market.price,
				openInterest: market.openInterest,
				volume24h: market.volume24h,
				volume30d: market.volume30d,
				assetGroup: market.referenceAssetGroup,
				parentPlatform: market.parentPlatform,
				category: market.category,
				assetClass: market.assetClass,
				accessModel: market.accessModel,
				type: 'Perp',
				rwaClassification: market.rwaClassification,
				issuer: market.issuer,
				redeemable: null,
				attestations: null,
				cexListed: null,
				kycForMintRedeem: null,
				kycAllowlistedWhitelistedToTransferHold: null,
				transferable: null,
				selfCustody: null,
				stablecoin: null,
				governance: null,
				trueRWA: false,
				onChainMcap: null,
				activeMcap: null,
				defiActiveTvl: null,
				defiActiveTvlByChain: null
			}
			const hasCategoryMatch = selectedCategory
				? (asset.category ?? []).some((category) => rwaSlug(category) === selectedCategory)
				: true
			const hasPlatformMatch = selectedPlatform
				? getRealRwaPlatforms(asset.parentPlatform).some((platform) => rwaSlug(platform) === selectedPlatform)
				: true
			const hasAssetGroupMatch = selectedAssetGroup
				? rwaSlug(normalizeRwaAssetGroup(asset.assetGroup)) === selectedAssetGroup
				: true

			if (!hasCategoryMatch || !hasPlatformMatch || !hasAssetGroupMatch || ASSETS_TO_EXCLUDE.has(asset.assetName)) {
				continue
			}

			assets.push(asset)
			if (selectedPlatform) {
				assetNames.set(asset.assetName, assetNames.get(asset.assetName) ?? 0)
			}
			if (asset.type) {
				types.set(asset.type, types.get(asset.type) ?? 0)
			}
			for (const assetClass of asset.assetClass ?? []) {
				assetClasses.set(assetClass, assetClasses.get(assetClass) ?? 0)
			}
			const primaryCategory = getPrimaryRwaCategory(asset.category)
			if (primaryCategory) {
				categories.set(primaryCategory, categories.get(primaryCategory) ?? 0)
			}
			for (const platform of getRwaPlatforms(asset.parentPlatform)) {
				if (platform === UNKNOWN_PLATFORM) continue
				platforms.set(platform, platforms.get(platform) ?? 0)
			}
			const assetGroup = normalizeRwaAssetGroup(asset.assetGroup)
			assetGroups.set(assetGroup, assetGroups.get(assetGroup) ?? 0)
			if (asset.rwaClassification) {
				rwaClassifications.set(asset.rwaClassification, rwaClassifications.get(asset.rwaClassification) ?? 0)
			}
			if (asset.accessModel) {
				accessModels.set(asset.accessModel, accessModels.get(asset.accessModel) ?? 0)
			}
			if (asset.issuer) {
				issuers.set(asset.issuer, issuers.get(asset.issuer) ?? 0)
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
		const categoryNavValues = filterCategoriesForStandardRwaOverview(params.rwaList.categories).map((category) => ({
			label: category,
			to: `/rwa/category/${rwaSlug(category)}`
		}))
		const platformNavValues = params.rwaList.platforms.map((platform) => ({
			label: platform,
			to: `/rwa/platform/${rwaSlug(platform)}`
		}))
		const assetGroupNavValues = assetGroupValues.map((assetGroup) => {
			const normalizedAssetGroup = normalizeRwaAssetGroup(assetGroup)
			return {
				label: normalizedAssetGroup,
				to: `/rwa/asset-group/${rwaSlug(normalizedAssetGroup)}`
			}
		})

		// Pre-aggregate chart data server-side so we don't ship the huge ticker-level payload to the client.
		const aggregationMode: RWAChartAggregationMode = selectedAssetGroup ? 'assetName' : 'assetGroup'
		const defaultFilteredAssets = applyDefaultAssetFilters(assets, {
			includeStablecoins: defaultInclusion.includeStablecoins,
			includeGovernance: defaultInclusion.includeGovernance,
			mode,
			categorySlug: selectedCategory
		})
		const initialChartDataset = chartDataMs
			? {
					onChainMcap: appendRwaChartDatasetTotal(
						aggregateRwaMetricData(defaultFilteredAssets, chartDataMs.onChainMcap, aggregationMode)
					),
					activeMcap: appendRwaChartDatasetTotal(
						aggregateRwaMetricData(defaultFilteredAssets, chartDataMs.activeMcap, aggregationMode)
					),
					defiActiveTvl: appendRwaChartDatasetTotal(
						aggregateRwaMetricData(defaultFilteredAssets, chartDataMs.defiActiveTvl, aggregationMode)
					)
				}
			: null
		const initialOpenInterestChartDataset =
			selectedChain || openInterestChartRows == null
				? null
				: buildRwaOpenInterestDataset(defaultFilteredAssets, toRWAPerpsBreakdownChartDataset(openInterestChartRows))

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
				selectedCategory || selectedPlatform || selectedAssetGroup || chainNavValues.length === 0
					? []
					: [{ label: 'All', to: '/rwa' }, ...chainNavValues],
			categoryLinks:
				selectedCategory && categoryNavValues.length > 0
					? [{ label: 'All', to: '/rwa/categories' }, ...categoryNavValues]
					: [],
			selectedCategory: actualCategoryName ?? 'All',
			platformLinks:
				selectedPlatform && platformNavValues.length > 0
					? [{ label: 'All', to: '/rwa/platforms' }, ...platformNavValues]
					: [],
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
			initialOpenInterestChartDataset,
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
		fetchRWACategoryBreakdownChartData({ key: 'activeMcap', includeStablecoin: false, includeGovernance: false })
	])

	if (!data?.byCategory) {
		throw new Error('Failed to get RWA stats')
	}

	const rows: IRWACategoriesOverviewRow[] = []
	for (const category in data.byCategory) {
		if (!isCategoryIncludedInStandardRwaOverview(category)) continue
		rows.push({
			category,
			...data.byCategory[category]
		})
	}

	return {
		rows: rows.sort((a, b) => b.base.onChainMcap - a.base.onChainMcap),
		initialChartDataset: toBreakdownChartDataset(activeMcapRows)
	}
}

export async function getRWAPlatformsOverview(): Promise<IRWAPlatformsOverview> {
	const [data, activeMcapRows] = await Promise.all([
		fetchRWAStats(),
		fetchRWAPlatformBreakdownChartData({ key: 'activeMcap', includeStablecoin: false, includeGovernance: false })
	])

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

	return {
		rows: rows.sort((a, b) => b.base.onChainMcap - a.base.onChainMcap),
		initialChartDataset: toBreakdownChartDataset(activeMcapRows)
	}
}

export async function getRWAAssetGroupsOverview(): Promise<IRWAAssetGroupsOverview> {
	const [data, activeMcapRows] = await Promise.all([
		fetchRWAStats(),
		fetchRWAAssetGroupBreakdownChartData({ key: 'activeMcap', includeStablecoin: false, includeGovernance: false })
	])

	if (!data?.byAssetGroup) {
		throw new Error('Failed to get RWA stats')
	}

	const rows: IRWAAssetGroupsOverviewRow[] = []
	for (const assetGroup in data.byAssetGroup) {
		rows.push({
			assetGroup: normalizeRwaAssetGroup(assetGroup),
			...data.byAssetGroup[assetGroup]
		})
	}

	return {
		rows: rows.sort((a, b) => b.base.onChainMcap - a.base.onChainMcap),
		initialChartDataset: toBreakdownChartDataset(activeMcapRows)
	}
}

async function fetchYieldPoolData() {
	const { fetchJson } = await import('~/utils/async')
	const { YIELD_POOLS_API, YIELD_CONFIG_API, YIELD_URL_API } = await import('~/constants')

	const [poolsRes, configRes, urlsRes] = await Promise.all([
		fetchJson(YIELD_POOLS_API),
		fetchJson(YIELD_CONFIG_API),
		fetchJson(YIELD_URL_API)
	])

	return {
		allPools: poolsRes?.data ?? [],
		configProtocols: configRes?.protocols ?? {},
		poolUrls: urlsRes ?? {}
	}
}

export async function getRWAAssetData({ assetId }: { assetId: string }): Promise<IRWAAssetData | null> {
	try {
		const [data, chartDataset, blockExplorersData, yieldPoolData] = await Promise.all([
			fetchRWAAssetDataById(assetId),
			fetchRWAAssetChartData(assetId),
			fetchBlockExplorers().catch(() => []),
			fetchYieldPoolData().catch(() => null)
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

		// Match yield pools to this asset via: 1) address, 2) symbol+project, 3) exact ticker cross-protocol
		let yieldPools: IRWAAssetData['yieldPools'] = null
		let yieldPoolsTotal: IRWAAssetData['yieldPoolsTotal'] = null
		let nativeYieldPoolId: IRWAAssetData['nativeYieldPoolId'] = null
		let nativeYieldCurrent: IRWAAssetData['nativeYieldCurrent'] = null
		try {
			const hasContracts = !!data.contracts && Object.keys(data.contracts).length > 0
			const ticker = data.ticker?.toUpperCase()
			const hasTicker = !!ticker && ticker.length >= 3
			const hasProjectAndTicker = !!data.projectId && hasTicker

			if (hasContracts || hasTicker) {
				const addressesByChain = new Map<string, Set<string>>()
				if (hasContracts) {
					for (const [chain, addresses] of Object.entries(data.contracts!)) {
						const addrSet = new Set(addresses.map((a) => a.toLowerCase()))
						addressesByChain.set(chain.toLowerCase(), addrSet)
					}
				}

				// Resolve projectId(s) to protocol slugs
				const projectSlugs = new Set<string>()
				if (hasProjectAndTicker && data.projectId) {
					const ids = Array.isArray(data.projectId) ? data.projectId : [data.projectId]
					const metadataCache = await import('~/utils/metadata').then((m) => m.default)
					for (const id of ids) {
						const meta = metadataCache.protocolMetadata[String(id)] as
							| ((typeof metadataCache.protocolMetadata)[string] & { name?: string })
							| undefined
						if (meta?.name) projectSlugs.add(meta.name)
					}
				}

				if (!yieldPoolData) throw new Error('Yield pool data unavailable')
				const allPools: any[] = yieldPoolData.allPools
				const configProtocols: Record<string, { name?: string; category?: string }> = yieldPoolData.configProtocols
				const poolUrls: Record<string, string> = yieldPoolData.poolUrls

				const matchedPoolIds = new Set<string>()
				const matchedPools: typeof allPools = []

				for (const pool of allPools) {
					if (pool.apy === 0) continue
					if (matchedPoolIds.has(pool.pool)) continue
					if (pool.exposure !== 'single' || pool.ilRisk !== 'no') continue

					// 1) Address match
					if (hasContracts) {
						const underlyingTokens = pool.underlyingTokens ?? []
						if (underlyingTokens.length > 0) {
							const chainAddrs = pool.chain ? addressesByChain.get(pool.chain.toLowerCase()) : undefined
							if (chainAddrs && underlyingTokens.some((t: string) => chainAddrs.has(t.toLowerCase()))) {
								matchedPoolIds.add(pool.pool)
								matchedPools.push({ ...pool, _matchStrategy: 1 })
								continue
							}
						}
					}

					// 2) Symbol + project match (substring both directions to catch wrapped/staked variants)
					if (hasProjectAndTicker && projectSlugs.size > 0 && pool.symbol && projectSlugs.has(pool.project)) {
						const poolTokens = pool.symbol.toUpperCase().split(/[-+/]/)
						if (
							poolTokens.some((t: string) => {
								const trimmed = t.trim()
								return trimmed === ticker || trimmed.includes(ticker!) || ticker!.includes(trimmed)
							})
						) {
							matchedPoolIds.add(pool.pool)
							matchedPools.push({ ...pool, _matchStrategy: 2 })
							continue
						}
					}

					// 3) Cross-protocol exact ticker match
					if (hasTicker && pool.symbol) {
						const poolTokens = pool.symbol.toUpperCase().split(/[-+/]/)
						if (poolTokens.some((t: string) => t.trim() === ticker)) {
							matchedPoolIds.add(pool.pool)
							matchedPools.push({ ...pool, _matchStrategy: 3 })
						}
					}
				}

				// Separate issuer pools (native yield) from DeFi pools; fallback to issuer name matching
				const issuerProjectSlugs = new Set(projectSlugs)
				if (issuerProjectSlugs.size === 0 && data.issuer) {
					const issuerLower = data.issuer.trim().toLowerCase()
					const candidates: string[] = []
					const firstWord = issuerLower.split(/\s+/)[0]
					if (firstWord.length >= 3) candidates.push(firstWord)
					const parenMatch = issuerLower.match(/\(([^)]+)\)/)
					if (parenMatch) {
						const normalized = parenMatch[1].replace(/[^a-z0-9]/g, '')
						if (normalized.length >= 3) candidates.push(normalized)
					}

					for (const pool of matchedPools) {
						const slugNormalized = pool.project.toLowerCase().replace(/[^a-z0-9]/g, '')
						for (const candidate of candidates) {
							if (slugNormalized.startsWith(candidate) || candidate.startsWith(slugNormalized)) {
								issuerProjectSlugs.add(pool.project)
								break
							}
						}
					}
				}

				const issuerPools = matchedPools.filter((p: any) => issuerProjectSlugs.has(p.project))
				const defiPools = matchedPools.filter((p: any) => !issuerProjectSlugs.has(p.project))

				issuerPools.sort((a: any, b: any) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))
				const primaryIssuerPool = issuerPools[0] ?? null
				nativeYieldPoolId = primaryIssuerPool?.pool ?? null
				nativeYieldCurrent = primaryIssuerPool?.apyBase ?? null

				defiPools.sort((a: any, b: any) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))
				yieldPoolsTotal = defiPools.length
				const cappedPools = defiPools.slice(0, 10)

				yieldPools = cappedPools.map((pool) => ({
					...pool,
					tvl: pool.tvlUsd,
					pool: pool.symbol,
					configID: pool.pool,
					chains: [pool.chain],
					project: configProtocols[pool.project]?.name ?? pool.project,
					projectslug: pool.project,
					url: poolUrls[pool.pool] || null
				}))

				if (yieldPools.length === 0) {
					yieldPools = null
					yieldPoolsTotal = null
				}
			}
		} catch (err) {
			console.log('[HTTP]:[ERROR]:[RWA_YIELD]:', assetId, err instanceof Error ? err.message : '')
		}

		return {
			...data,
			slug: data.canonicalMarketId ?? data.id,
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
			chartDataset,
			yieldPools,
			yieldPoolsTotal,
			nativeYieldPoolId,
			nativeYieldCurrent
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
