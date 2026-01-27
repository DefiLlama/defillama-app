import { RWA_ACTIVE_TVLS_API } from '~/constants'
import definitions from '~/public/rwa-definitions.json'
import { formatNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { rwaSlug } from './rwaSlug'

interface IFetchedRWAProject {
	ticker: string
	name: string
	website: string | string[] | null
	twitter: string | string[] | null
	primaryChain: string | null
	chain: string[] | null
	contracts: Record<string, Array<string>> | null
	category: string[] | null
	assetClass: string[] | null
	type: string | null
	rwaClassification: string | null
	accessModel: 'Permissioned' | 'Permissionless' | 'Non-transferable' | 'Custodial Only' | 'Unknown' | null
	issuer: string | null
	issuerSourceLink: string | string[] | null
	issuerRegistryInfo: string | string[] | null
	isin: string | null
	attestationLinks: string | string[] | null
	attestations: boolean | null
	redeemable: boolean | null
	cexListed: boolean | null
	kycForMintRedeem: boolean | null
	kycAllowlistedWhitelistedToTransferHold: boolean | null
	transferable: boolean | null
	selfCustody: boolean | null
	descriptionNotes: string | null
	parentPlatform: string | null
	stablecoin: boolean | null
	governance: boolean | null
	defiActiveTvl: Record<string, Record<string, string>> | null
	onChainMarketcap: Record<string, string> | null
	activeMcap: Record<string, string> | null
	price?: number | null
}

export interface IRWAProject extends Omit<
	IFetchedRWAProject,
	| 'onChainMarketcap'
	| 'activeMcap'
	| 'defiActiveTvl'
	| 'website'
	| 'twitter'
	| 'issuerRegistryInfo'
	| 'accessModel'
	| 'issuerSourceLink'
> {
	accessModel: 'Permissioned' | 'Permissionless' | 'Non-transferable' | 'Custodial Only' | 'Unknown'
	website: string[] | null
	twitter: string[] | null
	issuerRegistryInfo: string[] | null
	issuerSourceLink: string[] | null
	trueRWA: boolean
	onChainMarketcap: {
		total: number
		breakdown: Array<[string, number]>
	}
	activeMarketcap: {
		total: number
		breakdown: Array<[string, number]>
	}
	defiActiveTvl: {
		total: number
		breakdown: Array<[string, number]>
	}
}

export interface IRWAAssetsOverview {
	assets: Array<IRWAProject>
	assetClasses: Array<string>
	assetClassOptions: Array<{ key: string; name: string; help?: string }>
	rwaClassifications: Array<string>
	rwaClassificationOptions: Array<{ key: string; name: string; help?: string }>
	accessModels: Array<string>
	accessModelOptions: Array<{ key: string; name: string; help?: string }>
	categories: Array<string>
	categoriesOptions: Array<{ key: string; name: string; help?: string }>
	assetNames: Array<string>
	stablecoinCategories: Array<string>
	stablecoinAssetClasses: Array<string>
	stablecoinClassifications: Array<string>
	governanceCategories: Array<string>
	governanceAssetClasses: Array<string>
	governanceClassifications: Array<string>
	categoryValues: Array<{ name: string; value: number }>
	issuers: Array<string>
	platformLinks: Array<{ label: string; to: string }>
	selectedPlatform: string
	chains: Array<{ label: string; to: string }>
	selectedChain: string
	categoryLinks: Array<{ label: string; to: string }>
	selectedCategory: string
	totalOnChainMarketcap: number
	totalActiveMarketcap: number
	totalOnChainStablecoinValue: number
	totalOnChainDeFiActiveTvl: number
}

export interface IRWAChainsOverviewRow {
	chain: string
	totalOnChainMarketcap: number
	totalActiveMarketcap: number
	totalAssetIssuers: number
	totalDefiActiveTvl: number
	stablecoinOnChainMarketcap: number
	governanceOnChainMarketcap: number
	stablecoinActiveMarketcap: number
	governanceActiveMarketcap: number
	stablecoinDefiActiveTvl: number
	governanceDefiActiveTvl: number
	totalAssetIssuersWithStablecoins: number
	totalAssetIssuersWithGovernance: number
	totalAssetIssuersWithStablecoinsAndGovernance: number
}

export interface IRWACategoriesOverviewRow {
	category: string
	totalOnChainMarketcap: number
	totalActiveMarketcap: number
	totalAssetIssuers: number
	totalStablecoinsValue: number
	totalDefiActiveTvl: number
}

export interface IRWAPlatformsOverviewRow {
	platform: string
	totalOnChainMarketcap: number
	totalActiveMarketcap: number
	totalStablecoinsValue: number
	totalDefiActiveTvl: number
}

const stablecoinCategories = ['Fiat-Backed Stablecoins', 'Stablecoins backed by RWAs', 'Non-RWA Stablecoins']
const stablecoinAssetClasses: string[] = [
	'USD fiat stablecoin',
	'Synthetic backed stablecoin',
	'Crypto-collateralized stablecoin (non-RWA)',
	'Hybrid / multi-asset RWA stablecoin',
	'Yield-bearing RWA stablecoin',
	'Stablecoin yield wrapper',
	'Other fiat stablecoin',
	'EUR fiat stablecoin',
	'Algorithmic / undercollateralized stablecoin',
	'RWA-backed fiat stablecoin (non-yielding)',
	'Yield-bearing fiat stablecoin',
	'Bank deposit token'
]
const stablecoinClassifications = []

const governanceCategories = ['Governance & Protocol Tokens']
const governanceAssetClasses = ['Governance / voting token (RWA protocol)', 'Revenue / fee share token (RWA protocol)']
const governanceClassifications = ['Non-RWA (Gov/Utility)']

const sumRecordNumbers = (record: Record<string, unknown> | null | undefined): number => {
	if (!record) return 0
	let total = 0
	for (const key in record) {
		total += safeNumber((record as any)[key])
	}
	return total
}

const sumDefiByChain = (defi: Record<string, Record<string, string>> | null | undefined, chain: string): number => {
	if (!defi) return 0
	const protocols = defi[chain]
	if (!protocols) return 0
	let total = 0
	for (const protocol in protocols) {
		total += safeNumber(protocols[protocol])
	}
	return total
}

const sumDefiAllChains = (defi: Record<string, Record<string, string>> | null | undefined): number => {
	if (!defi) return 0
	let total = 0
	for (const chain in defi) {
		total += sumDefiByChain(defi, chain)
	}
	return total
}

export type RWAAssetsOverviewParams = {
	chain?: string
	category?: string
	platform?: string
}

export async function getRWAAssetsOverview(params?: RWAAssetsOverviewParams): Promise<IRWAAssetsOverview | null> {
	try {
		const selectedChain = params?.chain ? rwaSlug(params.chain) : undefined
		const selectedCategory = params?.category ? rwaSlug(params.category) : undefined
		const selectedPlatform = params?.platform ? rwaSlug(params.platform) : undefined

		// Route-level filtering supports chain OR category OR platform, not multiple at once.
		const selectedCount = Number(!!selectedChain) + Number(!!selectedCategory) + Number(!!selectedPlatform)
		if (selectedCount > 1) return null

		const raw = await fetchJson<any>(RWA_ACTIVE_TVLS_API)
		const data: Record<string, IFetchedRWAProject> | null = raw?.data ?? raw

		if (!data || typeof data !== 'object') {
			return null
		}

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
		const assetClasses = new Map<string, number>()
		const rwaClassifications = new Map<string, number>()
		const accessModels = new Map<string, number>()
		const categories = new Map<string, number>()
		const assetNames = new Map<string, number>()
		const categoryNavValues = new Map<string, number>()
		const platformNavValues = new Map<string, number>()
		const issuers = new Map<string, number>()
		const chains = new Map<string, number>()
		let totalOnChainMarketcapAllAssets = 0
		let totalActiveMarketcapAllAssets = 0
		let totalOnChainStablecoinValueAllAssets = 0
		let totalOnChainDeFiActiveTvlAllAssets = 0

		for (const rwaId in data) {
			const item = data[rwaId]

			let totalOnChainMarketcapForAsset = 0
			let totalActiveMarketcapForAsset = 0
			let totalDeFiActiveTvlForAsset = 0
			let filteredOnChainMarketcapForAsset = 0
			let filteredActiveMarketcapForAsset = 0
			let filteredDeFiActiveTvlForAsset = 0
			const onChainMarketcapBreakdown = item.onChainMarketcap ?? {}
			const activeMarketcapBreakdown = item.activeMcap ?? {}
			const defiActiveTvlBreakdown = item.defiActiveTvl ?? {}
			const finalOnChainMarketcapBreakdown: Record<string, number> = {}
			const finalActiveMarketcapBreakdown: Record<string, number> = {}
			const finalDeFiActiveTvlBreakdown: Record<string, number> = {}
			const finalDeFiActiveTvlBreakdownFiltered: Record<string, number> = {}
			const isChainFiltered = !!selectedChain
			const hasCategoryMatch = selectedCategory
				? (item.category ?? []).some((c) => c && rwaSlug(c) === selectedCategory)
				: true
			const hasPlatformMatch = selectedPlatform
				? !!item.parentPlatform && rwaSlug(item.parentPlatform) === selectedPlatform
				: true

			for (const chain in onChainMarketcapBreakdown) {
				const value = safeNumber(onChainMarketcapBreakdown[chain])
				finalOnChainMarketcapBreakdown[chain] = (finalOnChainMarketcapBreakdown[chain] || 0) + value
				totalOnChainMarketcapForAsset += value
				if (selectedChain && rwaSlug(chain) === selectedChain) {
					filteredOnChainMarketcapForAsset += value
				}
			}

			// For category navigation, we always use total on-chain marketcap (not filtered) so ordering stays consistent.
			for (const category of item.category ?? []) {
				if (category) {
					categoryNavValues.set(category, (categoryNavValues.get(category) ?? 0) + totalOnChainMarketcapForAsset)
				}
			}

			// For platform navigation, we always use total on-chain marketcap (not filtered) so ordering stays consistent.
			if (item.parentPlatform) {
				platformNavValues.set(
					item.parentPlatform,
					(platformNavValues.get(item.parentPlatform) ?? 0) + totalOnChainMarketcapForAsset
				)
			}

			for (const chain in activeMarketcapBreakdown) {
				const value = safeNumber(activeMarketcapBreakdown[chain])
				finalActiveMarketcapBreakdown[chain] = (finalActiveMarketcapBreakdown[chain] || 0) + value
				totalActiveMarketcapForAsset += value
				if (selectedChain && rwaSlug(chain) === selectedChain) {
					filteredActiveMarketcapForAsset += value
				}
			}

			for (const chain in defiActiveTvlBreakdown) {
				const isSelectedChain = !isChainFiltered || rwaSlug(chain) === selectedChain
				for (const protocolName in defiActiveTvlBreakdown[chain]) {
					const value = safeNumber(defiActiveTvlBreakdown[chain][protocolName])
					finalDeFiActiveTvlBreakdown[protocolName] = (finalDeFiActiveTvlBreakdown[protocolName] || 0) + value
					totalDeFiActiveTvlForAsset += value
					if (isSelectedChain && selectedChain) {
						finalDeFiActiveTvlBreakdownFiltered[protocolName] =
							(finalDeFiActiveTvlBreakdownFiltered[protocolName] || 0) + value
						filteredDeFiActiveTvlForAsset += value
					}
				}
			}

			// Check if asset has actual TVL on the selected chain (from TVL data, not just chain array)
			const hasChainInTvl = selectedChain
				? filteredOnChainMarketcapForAsset > 0 ||
					filteredActiveMarketcapForAsset > 0 ||
					filteredDeFiActiveTvlForAsset > 0
				: true

			// Use filtered values if chain is selected, otherwise use totals
			const effectiveOnChainMarketcap = selectedChain ? filteredOnChainMarketcapForAsset : totalOnChainMarketcapForAsset
			const effectiveActiveMarketcap = selectedChain ? filteredActiveMarketcapForAsset : totalActiveMarketcapForAsset
			const effectiveDeFiActiveTvl = selectedChain ? filteredDeFiActiveTvlForAsset : totalDeFiActiveTvlForAsset

			const isTrueRWA = item.rwaClassification === 'True RWA'
			const sortedCategories =
				selectedCategory && Array.isArray(item.category)
					? [
							...item.category.filter((c) => c && rwaSlug(c) === selectedCategory),
							...item.category.filter((c) => c && rwaSlug(c) !== selectedCategory)
						]
					: (item.category ?? null)
			const asset: IRWAProject = {
				ticker: typeof item.ticker === 'string' && item.ticker !== '-' ? item.ticker : null,
				name: typeof item.name === 'string' && item.name !== '-' ? item.name : null,
				website: item.website == null ? null : Array.isArray(item.website) ? item.website : [item.website],
				twitter: item.twitter == null ? null : Array.isArray(item.twitter) ? item.twitter : [item.twitter],
				primaryChain: item.primaryChain ?? null,
				chain: item.chain ?? null,
				contracts: item.contracts ?? null,
				category: sortedCategories,
				assetClass: item.assetClass ?? null,
				type: item.type ?? null,
				rwaClassification: isTrueRWA ? 'RWA' : (item.rwaClassification ?? null),
				trueRWA: isTrueRWA,
				accessModel: item.accessModel ?? 'Unknown',
				issuer: item.issuer ?? null,
				issuerSourceLink:
					item.issuerSourceLink == null
						? null
						: Array.isArray(item.issuerSourceLink)
							? item.issuerSourceLink
							: [item.issuerSourceLink],
				issuerRegistryInfo:
					item.issuerRegistryInfo == null
						? null
						: Array.isArray(item.issuerRegistryInfo)
							? item.issuerRegistryInfo
							: [item.issuerRegistryInfo],
				isin: item.isin ?? null,
				attestationLinks: item.attestationLinks ?? null,
				attestations: item.attestations ?? null,
				redeemable: item.redeemable ?? null,
				cexListed: item.cexListed ?? null,
				kycForMintRedeem: item.kycForMintRedeem ?? null,
				kycAllowlistedWhitelistedToTransferHold: item.kycAllowlistedWhitelistedToTransferHold ?? null,
				transferable: item.transferable ?? null,
				selfCustody: item.selfCustody ?? null,
				descriptionNotes: item.descriptionNotes ?? null,
				parentPlatform: item.parentPlatform ?? null,
				stablecoin: item.stablecoin ?? null,
				governance: item.governance ?? null,
				onChainMarketcap: {
					total: effectiveOnChainMarketcap,
					breakdown: Object.entries(finalOnChainMarketcapBreakdown)
						.filter(([chain]) => !selectedChain || rwaSlug(chain) === selectedChain)
						.sort((a, b) => b[1] - a[1])
				},
				activeMarketcap: {
					total: effectiveActiveMarketcap,
					breakdown: Object.entries(finalActiveMarketcapBreakdown)
						.filter(([chain]) => !selectedChain || rwaSlug(chain) === selectedChain)
						.sort((a, b) => b[1] - a[1])
				},
				defiActiveTvl: {
					total: effectiveDeFiActiveTvl,
					breakdown: Object.entries(
						isChainFiltered ? finalDeFiActiveTvlBreakdownFiltered : finalDeFiActiveTvlBreakdown
					).sort((a, b) => b[1] - a[1])
				},
				price: item.price != null ? Number(formatNum(item.price)) : null
			}

			// Only include asset if it exists on the selected chain/category (or no route filter)
			if (hasChainInTvl && hasCategoryMatch && hasPlatformMatch && asset.name) {
				assets.push(asset)
				// Only expose `assetNames` when filtering by platform (used for platform-level UI filters).
				if (selectedPlatform) {
					assetNames.set(asset.name, (assetNames.get(asset.name) ?? 0) + effectiveOnChainMarketcap)
				}

				// Track total values
				totalOnChainMarketcapAllAssets += effectiveOnChainMarketcap
				totalActiveMarketcapAllAssets += effectiveActiveMarketcap
				if (item.stablecoin) {
					totalOnChainStablecoinValueAllAssets += effectiveOnChainMarketcap
				}
				totalOnChainDeFiActiveTvlAllAssets += effectiveDeFiActiveTvl

				// Add to categories/issuers/assetClasses/rwaClassifications/accessModels for assets on this chain
				for (const assetClass of asset.assetClass ?? []) {
					if (assetClass) {
						assetClasses.set(assetClass, (assetClasses.get(assetClass) ?? 0) + effectiveOnChainMarketcap)
					}
				}
				for (const category of asset.category ?? []) {
					if (category) {
						categories.set(category, (categories.get(category) ?? 0) + effectiveOnChainMarketcap)
					}
				}
				if (asset.rwaClassification) {
					rwaClassifications.set(
						asset.rwaClassification,
						(rwaClassifications.get(asset.rwaClassification) ?? 0) + effectiveOnChainMarketcap
					)
				}
				if (asset.accessModel) {
					accessModels.set(asset.accessModel, (accessModels.get(asset.accessModel) ?? 0) + effectiveOnChainMarketcap)
				}
				if (asset.issuer) {
					issuers.set(asset.issuer, (issuers.get(asset.issuer) ?? 0) + effectiveOnChainMarketcap)
				}
			}

			// Chains list always uses total TVL (not filtered) so order stays consistent
			for (const chain of asset.chain ?? []) {
				if (chain) {
					chains.set(chain, (chains.get(chain) ?? 0) + totalOnChainMarketcapForAsset)
				}
			}
		}

		const formattedRwaClassifications = Array.from(rwaClassifications.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		const formattedAccessModels = Array.from(accessModels.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		const formattedAssetClasses = Array.from(assetClasses.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		const formattedCategories = Array.from(categories.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		return {
			assets: assets.sort((a, b) => b.onChainMarketcap.total - a.onChainMarketcap.total),
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
			assetNames: selectedPlatform
				? Array.from(assetNames.entries())
						.sort((a, b) => b[1] - a[1])
						.map(([key]) => key)
				: [],
			stablecoinAssetClasses,
			stablecoinCategories,
			stablecoinClassifications,
			governanceCategories,
			governanceAssetClasses,
			governanceClassifications,
			categoryValues: Array.from(categories.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([name, value]) => ({ name, value })),
			issuers: Array.from(issuers.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([key]) => key),
			selectedChain: actualChainName ?? 'All',
			chains:
				selectedCategory || selectedPlatform
					? []
					: [
							{ label: 'All', to: '/rwa' },
							...Array.from(chains.entries())
								.sort((a, b) => b[1] - a[1])
								.map(([key]) => ({ label: key, to: `/rwa/chain/${rwaSlug(key)}` }))
						],
			// Category navigation should always include *all* categories in a stable global order,
			// even on a filtered category page.
			categoryLinks: selectedCategory
				? [
						{ label: 'All', to: '/rwa/categories' },
						...Array.from(categoryNavValues.entries())
							.sort((a, b) => b[1] - a[1])
							.map(([key]) => ({ label: key, to: `/rwa/category/${rwaSlug(key)}` }))
					]
				: [],
			selectedCategory: actualCategoryName ?? 'All',
			platformLinks: selectedPlatform
				? [
						{ label: 'All', to: '/rwa/platforms' },
						...Array.from(platformNavValues.entries())
							.sort((a, b) => b[1] - a[1])
							.map(([key]) => ({ label: key, to: `/rwa/platform/${rwaSlug(key)}` }))
					]
				: [],
			selectedPlatform: actualPlatformName ?? 'All',
			totalOnChainMarketcap: totalOnChainMarketcapAllAssets,
			totalActiveMarketcap: totalActiveMarketcapAllAssets,
			totalOnChainStablecoinValue: totalOnChainStablecoinValueAllAssets,
			totalOnChainDeFiActiveTvl: totalOnChainDeFiActiveTvlAllAssets
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA assets overview')
	}
}

export async function getRWAChainsList(): Promise<string[]> {
	const raw = await fetchJson<any>(RWA_ACTIVE_TVLS_API)
	const data: Record<string, IFetchedRWAProject> | null = raw?.data ?? raw
	if (!data || typeof data !== 'object') return []
	const chains = new Set<string>()

	for (const rwaId in data) {
		for (const chain of data[rwaId].chain ?? []) {
			if (chain) {
				chains.add(rwaSlug(chain))
			}
		}
	}

	return Array.from(chains)
}

export async function getRWACategoriesList(): Promise<string[]> {
	const raw = await fetchJson<any>(RWA_ACTIVE_TVLS_API)
	const data: Record<string, IFetchedRWAProject> | null = raw?.data ?? raw
	if (!data || typeof data !== 'object') return []
	const categories = new Set<string>()

	for (const rwaId in data) {
		for (const category of data[rwaId].category ?? []) {
			if (category) {
				categories.add(rwaSlug(category))
			}
		}
	}

	return Array.from(categories)
}

export async function getRWAChainsOverview(): Promise<IRWAChainsOverviewRow[] | null> {
	const raw = await fetchJson<any>(RWA_ACTIVE_TVLS_API)
	const data: Record<string, IFetchedRWAProject> | null = raw?.data ?? raw
	if (!data || typeof data !== 'object') return null

	const totalsByChain = new Map<
		string,
		{
			// Default behavior: exclude stablecoins + governance assets from these base totals.
			baseOnChainMarketcap: number
			baseActiveMarketcap: number
			baseDefiActiveTvl: number
			baseIssuers: Set<string>

			// Separate buckets so UI can optionally include them without double counting.
			stablecoinOnChainMarketcap: number
			stablecoinActiveMarketcap: number
			stablecoinDefiActiveTvl: number
			stablecoinIssuers: Set<string>

			governanceOnChainMarketcap: number
			governanceActiveMarketcap: number
			governanceDefiActiveTvl: number
			governanceIssuers: Set<string>
		}
	>()

	const getOrInit = (chain: string) => {
		const prev = totalsByChain.get(chain)
		if (prev) return prev
		const next = {
			baseOnChainMarketcap: 0,
			baseActiveMarketcap: 0,
			baseDefiActiveTvl: 0,
			baseIssuers: new Set<string>(),

			stablecoinOnChainMarketcap: 0,
			stablecoinActiveMarketcap: 0,
			stablecoinDefiActiveTvl: 0,
			stablecoinIssuers: new Set<string>(),

			governanceOnChainMarketcap: 0,
			governanceActiveMarketcap: 0,
			governanceDefiActiveTvl: 0,
			governanceIssuers: new Set<string>()
		}
		totalsByChain.set(chain, next)
		return next
	}

	for (const rwaId in data) {
		const item = data[rwaId]
		const issuer = item.issuer ?? null
		const isStablecoin = !!item.stablecoin
		const isGovernance = !!item.governance
		const onChainByChain = item.onChainMarketcap ?? {}
		const activeByChain = item.activeMcap ?? {}
		const defiByChain = item.defiActiveTvl ?? {}

		const chainKeys = new Set<string>([
			...Object.keys(onChainByChain),
			...Object.keys(activeByChain),
			...Object.keys(defiByChain)
		])

		for (const chain of chainKeys) {
			const onChain = safeNumber((onChainByChain as any)[chain])
			const active = safeNumber((activeByChain as any)[chain])
			const defi = sumDefiByChain(defiByChain, chain)

			if (onChain === 0 && active === 0 && defi === 0) continue

			const agg = getOrInit(chain)

			// Assign each asset to exactly one bucket to keep toggling logic simple:
			// stablecoin > governance > base
			if (isStablecoin) {
				agg.stablecoinOnChainMarketcap += onChain
				agg.stablecoinActiveMarketcap += active
				agg.stablecoinDefiActiveTvl += defi
				if (issuer) agg.stablecoinIssuers.add(issuer)
			} else if (isGovernance) {
				agg.governanceOnChainMarketcap += onChain
				agg.governanceActiveMarketcap += active
				agg.governanceDefiActiveTvl += defi
				if (issuer) agg.governanceIssuers.add(issuer)
			} else {
				agg.baseOnChainMarketcap += onChain
				agg.baseActiveMarketcap += active
				agg.baseDefiActiveTvl += defi
				if (issuer) agg.baseIssuers.add(issuer)
			}
		}
	}

	return Array.from(totalsByChain.entries())
		.map(([chain, v]) => {
			const issuersBase = v.baseIssuers
			const issuersStablecoin = new Set<string>([...issuersBase, ...v.stablecoinIssuers])
			const issuersGovernance = new Set<string>([...issuersBase, ...v.governanceIssuers])
			const issuersBoth = new Set<string>([...issuersBase, ...v.stablecoinIssuers, ...v.governanceIssuers])

			return {
				chain,
				totalOnChainMarketcap: v.baseOnChainMarketcap,
				totalActiveMarketcap: v.baseActiveMarketcap,
				totalAssetIssuers: issuersBase.size,
				totalDefiActiveTvl: v.baseDefiActiveTvl,
				stablecoinOnChainMarketcap: v.stablecoinOnChainMarketcap,
				governanceOnChainMarketcap: v.governanceOnChainMarketcap,
				stablecoinActiveMarketcap: v.stablecoinActiveMarketcap,
				governanceActiveMarketcap: v.governanceActiveMarketcap,
				stablecoinDefiActiveTvl: v.stablecoinDefiActiveTvl,
				governanceDefiActiveTvl: v.governanceDefiActiveTvl,
				totalAssetIssuersWithStablecoins: issuersStablecoin.size,
				totalAssetIssuersWithGovernance: issuersGovernance.size,
				totalAssetIssuersWithStablecoinsAndGovernance: issuersBoth.size
			}
		})
		.sort((a, b) => b.totalOnChainMarketcap - a.totalOnChainMarketcap)
}

export async function getRWACategoriesOverview(): Promise<IRWACategoriesOverviewRow[] | null> {
	const raw = await fetchJson<any>(RWA_ACTIVE_TVLS_API)
	const data: Record<string, IFetchedRWAProject> | null = raw?.data ?? raw
	if (!data || typeof data !== 'object') return null

	const totalsByCategory = new Map<
		string,
		{
			category: string
			totalOnChainMarketcap: number
			totalActiveMarketcap: number
			totalStablecoinsValue: number
			totalDefiActiveTvl: number
			issuers: Set<string>
		}
	>()

	// Prefer a "human" display label when multiple raw category strings map to the same slug.
	const pickDisplayCategory = (prev: string, next: string) => {
		// If the current label looks slug-like but the new one looks human, prefer the new one.
		const looksSluggy = (s: string) => s.includes('-') && !s.includes(' ')
		if (looksSluggy(prev) && !looksSluggy(next)) return next
		return prev
	}

	const getOrInit = (categorySlug: string, displayCategory: string) => {
		const prev = totalsByCategory.get(categorySlug)
		if (prev) return prev
		const next = {
			category: displayCategory,
			totalOnChainMarketcap: 0,
			totalActiveMarketcap: 0,
			totalStablecoinsValue: 0,
			totalDefiActiveTvl: 0,
			issuers: new Set<string>()
		}
		totalsByCategory.set(categorySlug, next)
		return next
	}

	for (const rwaId in data) {
		const item = data[rwaId]
		const categories = item.category ?? []
		if (!categories || categories.length === 0) continue

		const issuer = item.issuer ?? null
		const isStablecoin = !!item.stablecoin
		const totalOnChain = sumRecordNumbers(item.onChainMarketcap)
		const totalActive = sumRecordNumbers(item.activeMcap)
		const totalDefi = sumDefiAllChains(item.defiActiveTvl)

		// Keep issuer counts consistent with the detail page:
		// even if an asset currently has 0 on-chain/active/DeFi values, it should still contribute
		// to unique issuer counts for its category (but it won't affect totals since we add 0s).
		if (!issuer && totalOnChain === 0 && totalActive === 0 && totalDefi === 0) continue

		for (const category of categories) {
			if (!category) continue
			const categorySlug = rwaSlug(category)
			if (!categorySlug) continue
			const agg = getOrInit(categorySlug, category)
			agg.category = pickDisplayCategory(agg.category, category)
			agg.totalOnChainMarketcap += totalOnChain
			agg.totalActiveMarketcap += totalActive
			agg.totalDefiActiveTvl += totalDefi
			if (isStablecoin) agg.totalStablecoinsValue += totalOnChain
			if (issuer) agg.issuers.add(issuer)
		}
	}

	return Array.from(totalsByCategory.entries())
		.map(([, v]) => ({
			category: v.category,
			totalOnChainMarketcap: v.totalOnChainMarketcap,
			totalActiveMarketcap: v.totalActiveMarketcap,
			totalAssetIssuers: v.issuers.size,
			totalStablecoinsValue: v.totalStablecoinsValue,
			totalDefiActiveTvl: v.totalDefiActiveTvl
		}))
		.sort((a, b) => b.totalOnChainMarketcap - a.totalOnChainMarketcap)
}

export async function getRWAPlatformsOverview(): Promise<IRWAPlatformsOverviewRow[] | null> {
	const raw = await fetchJson<any>(RWA_ACTIVE_TVLS_API)
	const data: Record<string, IFetchedRWAProject> | null = raw?.data ?? raw
	if (!data || typeof data !== 'object') return null

	const totalsByPlatform = new Map<
		string,
		{
			platform: string
			totalOnChainMarketcap: number
			totalActiveMarketcap: number
			totalStablecoinsValue: number
			totalDefiActiveTvl: number
		}
	>()

	// Prefer a "human" display label when multiple raw platform strings map to the same slug.
	const pickDisplayPlatform = (prev: string, next: string) => {
		const looksSluggy = (s: string) => s.includes('-') && !s.includes(' ')
		if (looksSluggy(prev) && !looksSluggy(next)) return next
		return prev
	}

	const getOrInit = (platformSlug: string, displayPlatform: string) => {
		const prev = totalsByPlatform.get(platformSlug)
		if (prev) return prev
		const next = {
			platform: displayPlatform,
			totalOnChainMarketcap: 0,
			totalActiveMarketcap: 0,
			totalStablecoinsValue: 0,
			totalDefiActiveTvl: 0
		}
		totalsByPlatform.set(platformSlug, next)
		return next
	}

	for (const rwaId in data) {
		const item = data[rwaId]
		// Platforms overview is derived from assets' `parentPlatform` only.
		// (Ignore `type === 'Platform'` entirely.)
		const platform = item.parentPlatform ?? null
		if (!platform) continue

		const platformSlug = rwaSlug(platform)
		if (!platformSlug) continue

		const isStablecoin = !!item.stablecoin
		const totalOnChain = sumRecordNumbers(item.onChainMarketcap)
		const totalActive = sumRecordNumbers(item.activeMcap)
		const totalDefi = sumDefiAllChains(item.defiActiveTvl)

		// Skip completely empty rows (no totals + no platform label).
		if (totalOnChain === 0 && totalActive === 0 && totalDefi === 0) continue

		const agg = getOrInit(platformSlug, platform)
		agg.platform = pickDisplayPlatform(agg.platform, platform)
		agg.totalOnChainMarketcap += totalOnChain
		agg.totalActiveMarketcap += totalActive
		agg.totalDefiActiveTvl += totalDefi
		if (isStablecoin) agg.totalStablecoinsValue += totalOnChain
	}

	return Array.from(totalsByPlatform.entries())
		.map(([, v]) => ({
			platform: v.platform,
			totalOnChainMarketcap: v.totalOnChainMarketcap,
			totalActiveMarketcap: v.totalActiveMarketcap,
			totalStablecoinsValue: v.totalStablecoinsValue,
			totalDefiActiveTvl: v.totalDefiActiveTvl
		}))
		.sort((a, b) => b.totalOnChainMarketcap - a.totalOnChainMarketcap)
}

export interface IRWAAssetData extends IRWAProject {
	slug: string
	rwaClassificationDescription: string | null
	accessModelDescription: string | null
	assetClassDescriptions: Record<string, string>
}

export async function getRWAAssetData(assetSlug: string): Promise<IRWAAssetData | null> {
	try {
		const raw = await fetchJson<any>(RWA_ACTIVE_TVLS_API)
		const data: Record<string, IFetchedRWAProject> | null = raw?.data ?? raw
		if (!data || typeof data !== 'object') return null

		// Find the asset by comparing ticker slugs
		for (const rwaId in data) {
			const item = data[rwaId]
			if (typeof item.ticker === 'string' && item.ticker !== '-' && slug(item.ticker) === assetSlug) {
				let totalOnChainMarketcapForAsset = 0
				let totalActiveMarketcapForAsset = 0
				let totalDeFiActiveTvlForAsset = 0
				const onChainMarketcapBreakdown = item.onChainMarketcap ?? {}
				const activeMarketcapBreakdown = item.activeMcap ?? {}
				const defiActiveTvlBreakdown = item.defiActiveTvl ?? {}
				const finalOnChainMarketcapBreakdown: Record<string, number> = {}
				const finalActiveMarketcapBreakdown: Record<string, number> = {}
				const finalDeFiActiveTvlBreakdown: Record<string, number> = {}

				for (const chain in onChainMarketcapBreakdown) {
					const value = safeNumber(onChainMarketcapBreakdown[chain])
					finalOnChainMarketcapBreakdown[chain] = (finalOnChainMarketcapBreakdown[chain] || 0) + value
					totalOnChainMarketcapForAsset += value
				}

				for (const chain in activeMarketcapBreakdown) {
					const value = safeNumber(activeMarketcapBreakdown[chain])
					finalActiveMarketcapBreakdown[chain] = (finalActiveMarketcapBreakdown[chain] || 0) + value
					totalActiveMarketcapForAsset += value
				}

				for (const chain in defiActiveTvlBreakdown) {
					for (const protocolName in defiActiveTvlBreakdown[chain]) {
						const value = safeNumber(defiActiveTvlBreakdown[chain][protocolName])
						finalDeFiActiveTvlBreakdown[protocolName] = (finalDeFiActiveTvlBreakdown[protocolName] || 0) + value
						totalDeFiActiveTvlForAsset += value
					}
				}

				const isTrueRWA = item.rwaClassification === 'True RWA'
				// Get the classification description - use True RWA definition if trueRWA flag
				const classificationKey = isTrueRWA ? 'True RWA' : item.rwaClassification
				const rwaClassificationDescription = classificationKey
					? (definitions.rwaClassification.values?.[classificationKey] ?? null)
					: null
				// Get access model and its description
				const accessModel = item.accessModel ?? 'Unknown'
				const accessModelDescription = definitions.accessModel.values?.[accessModel] ?? null
				// Get asset class descriptions
				const assetClassDescriptions: Record<string, string> = {}
				for (const ac of item.assetClass ?? []) {
					const description = ac ? definitions.assetClass.values?.[ac] : null
					if (description) {
						assetClassDescriptions[ac] = description
					}
				}
				return {
					slug: assetSlug,
					ticker: typeof item.ticker === 'string' && item.ticker !== '-' ? item.ticker : null,
					name: typeof item.name === 'string' && item.name !== '-' ? item.name : null,
					website: item.website == null ? null : Array.isArray(item.website) ? item.website : [item.website],
					twitter: item.twitter == null ? null : Array.isArray(item.twitter) ? item.twitter : [item.twitter],
					primaryChain: item.primaryChain ?? null,
					chain: item.chain ?? null,
					contracts: item.contracts ?? null,
					category: item.category ?? null,
					assetClass: item.assetClass ?? null,
					assetClassDescriptions,
					type: item.type ?? null,
					rwaClassification: isTrueRWA ? 'RWA' : (item.rwaClassification ?? null),
					rwaClassificationDescription,
					trueRWA: isTrueRWA,
					accessModel,
					accessModelDescription,
					issuer: item.issuer ?? null,
					issuerSourceLink:
						item.issuerSourceLink == null
							? null
							: Array.isArray(item.issuerSourceLink)
								? item.issuerSourceLink
								: [item.issuerSourceLink],
					issuerRegistryInfo:
						item.issuerRegistryInfo == null
							? null
							: Array.isArray(item.issuerRegistryInfo)
								? item.issuerRegistryInfo
								: [item.issuerRegistryInfo],
					isin: item.isin ?? null,
					attestationLinks: item.attestationLinks ?? null,
					attestations: item.attestations ?? null,
					redeemable: item.redeemable ?? null,
					cexListed: item.cexListed ?? null,
					kycForMintRedeem: item.kycForMintRedeem ?? null,
					kycAllowlistedWhitelistedToTransferHold: item.kycAllowlistedWhitelistedToTransferHold ?? null,
					transferable: item.transferable ?? null,
					selfCustody: item.selfCustody ?? null,
					descriptionNotes: item.descriptionNotes ?? null,
					parentPlatform: item.parentPlatform ?? null,
					stablecoin: item.stablecoin ?? null,
					governance: item.governance ?? null,
					onChainMarketcap: {
						total: totalOnChainMarketcapForAsset,
						breakdown: Object.entries(finalOnChainMarketcapBreakdown).sort((a, b) => b[1] - a[1])
					},
					activeMarketcap: {
						total: totalActiveMarketcapForAsset,
						breakdown: Object.entries(finalActiveMarketcapBreakdown).sort((a, b) => b[1] - a[1])
					},
					defiActiveTvl: {
						total: totalDeFiActiveTvlForAsset,
						breakdown: Object.entries(finalDeFiActiveTvlBreakdown).sort((a, b) => b[1] - a[1])
					},
					price: item.price != null ? Number(formatNum(item.price)) : null
				}
			}
		}

		return null
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA asset data')
	}
}

export async function getRWAAssetsList(): Promise<string[]> {
	try {
		const raw = await fetchJson<any>(RWA_ACTIVE_TVLS_API)
		const data: Record<string, IFetchedRWAProject> | null = raw?.data ?? raw
		if (!data || typeof data !== 'object') {
			throw new Error('Failed to get RWA assets list')
		}
		const assets: string[] = []

		for (const rwaId in data) {
			if (typeof data[rwaId].ticker === 'string' && data[rwaId].ticker !== '-') {
				assets.push(slug(data[rwaId].ticker))
			}
		}

		return assets
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA assets list')
	}
}

function safeNumber(value: unknown): number {
	const n = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(n) ? n : 0
}
