import { RWA_ACTIVE_TVLS_API, RWA_ASSET_DATA_API, RWA_STATS_API } from '~/constants'
import definitions from '~/public/rwa-definitions.json'
import { fetchJson } from '~/utils/async'
import { rwaSlug } from './rwaSlug'

interface IFetchedRWAProject {
	ticker: string
	name: string | null
	website?: string[] | null
	twitter?: string[] | null
	primaryChain?: string | null
	chain: string[] | null
	contracts: Record<string, Array<string>> | null
	category?: string[] | null
	assetClass?: string[] | null
	type?: string | null
	rwaClassification: string | null
	accessModel: 'Permissioned' | 'Permissionless' | 'Non-transferable' | 'Custodial Only' | 'Unknown'
	issuer?: string | null
	issuerSourceLink?: string[] | null
	issuerRegistryInfo?: string[] | null
	isin?: string | null
	attestationLinks?: string[] | null
	attestations?: boolean | null
	redeemable?: boolean | null
	cexListed?: boolean | null
	kycForMintRedeem?: boolean | null
	kycAllowlistedWhitelistedToTransferHold?: boolean | null
	transferable?: boolean | null
	selfCustody?: boolean | null
	descriptionNotes?: string[] | null
	parentPlatform?: string | null
	stablecoin?: boolean | null
	governance?: boolean | null
	defiActiveTvl?: Record<string, Record<string, string>> | null
	onChainMcap?: Record<string, string> | null
	activeMcap?: Record<string, string> | null
	price?: number | null
}

interface IRWAStatsResponse {
	totalOnChainMcap: number
	totalActiveMcap: number
	totalDefiActiveTvl: number
	totalAssets: number
	totalIssuers: number
	byChain: Record<
		string,
		{
			base: {
				onChainMcap: number
				activeMcap: number
				defiActiveTvl: number
				assetCount: number
				assetIssuers: number
			}
			stablecoinsOnly: {
				onChainMcap: number
				activeMcap: number
				defiActiveTvl: number
				assetCount: number
				assetIssuers: number
			}
			governanceOnly: {
				onChainMcap: number
				activeMcap: number
				defiActiveTvl: number
				assetCount: number
				assetIssuers: number
			}
			stablecoinsAndGovernance: {
				onChainMcap: number
				activeMcap: number
				defiActiveTvl: number
				assetCount: number
				assetIssuers: number
			}
		}
	>
	byCategory: Record<
		string,
		{
			onChainMcap: number
			activeMcap: number
			defiActiveTvl: number
			assetCount: number
			assetIssuers: number
		}
	>
	byPlatform?: Record<
		string,
		{
			onChainMcap: number
			activeMcap: number
			defiActiveTvl: number
			assetCount: number
			assetIssuers: number
		}
	>
}

export interface IRWAProject extends Omit<IFetchedRWAProject, 'onChainMcap' | 'activeMcap' | 'defiActiveTvl'> {
	trueRWA: boolean
	onChainMcap: {
		total: number
		breakdown: Array<[string, number]>
	}
	activeMcap: {
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
	chainLinks: Array<{ label: string; to: string }>
	selectedChain: string
	categoryLinks: Array<{ label: string; to: string }>
	selectedCategory: string
	totalOnChainMcap: number
	totalActiveMcap: number
	totalOnChainStablecoinValue: number
	totalOnChainDeFiActiveTvl: number
}

export interface IRWAChainsOverviewRow {
	chain: string
	base: {
		onChainMcap: number
		activeMcap: number
		defiActiveTvl: number
		assetCount: number
		assetIssuers: number
	}
	stablecoinsOnly: {
		onChainMcap: number
		activeMcap: number
		defiActiveTvl: number
		assetCount: number
		assetIssuers: number
	}
	governanceOnly: {
		onChainMcap: number
		activeMcap: number
		defiActiveTvl: number
		assetCount: number
		assetIssuers: number
	}
	stablecoinsAndGovernance: {
		onChainMcap: number
		activeMcap: number
		defiActiveTvl: number
		assetCount: number
		assetIssuers: number
	}
}

export interface IRWACategoriesOverviewRow {
	category: string
	onChainMcap: number
	activeMcap: number
	defiActiveTvl: number
	assetIssuers: number
	assetCount: number
}

export interface IRWAPlatformsOverviewRow {
	platform: string
	onChainMcap: number
	activeMcap: number
	defiActiveTvl: number
	assetIssuers: number
	assetCount: number
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

		const { data } = await fetchJson<{ data: Record<string, IFetchedRWAProject> }>(RWA_ACTIVE_TVLS_API)
		if (!data) {
			throw new Error('Failed to get RWA assets list')
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
		const chainNavValues = new Map<string, number>()
		const categoryNavValues = new Map<string, number>()
		const platformNavValues = new Map<string, number>()
		const issuers = new Map<string, number>()
		let totalOnChainMcapAllAssets = 0
		let totalActiveMcapAllAssets = 0
		let totalOnChainStablecoinValueAllAssets = 0
		let totalOnChainDeFiActiveTvlAllAssets = 0

		for (const rwaId in data) {
			const item = data[rwaId]

			let totalOnChainMcapForAsset = 0
			let totalActiveMcapForAsset = 0
			let totalDeFiActiveTvlForAsset = 0
			let filteredOnChainMcapForAsset = 0
			let filteredActiveMcapForAsset = 0
			let filteredDeFiActiveTvlForAsset = 0
			const onChainMcapBreakdown = item.onChainMcap ?? {}
			const activeMcapBreakdown = item.activeMcap ?? {}
			const defiActiveTvlBreakdown = item.defiActiveTvl ?? {}
			const finalOnChainMcapBreakdown: Record<string, number> = {}
			const finalActiveMcapBreakdown: Record<string, number> = {}
			const finalDeFiActiveTvlBreakdown: Record<string, number> = {}
			const finalDeFiActiveTvlBreakdownFiltered: Record<string, number> = {}
			const isChainFiltered = !!selectedChain
			let hasSelectedChainInOnChainMcap = false
			let hasSelectedChainInActiveMcap = false
			let hasSelectedChainInDeFiActiveTvl = false
			const hasCategoryMatch = selectedCategory
				? (item.category ?? []).some((c) => c && rwaSlug(c) === selectedCategory)
				: true
			const hasPlatformMatch = selectedPlatform
				? !!item.parentPlatform && rwaSlug(item.parentPlatform) === selectedPlatform
				: true

			for (const chain in onChainMcapBreakdown) {
				const value = safeNumber(onChainMcapBreakdown[chain])
				finalOnChainMcapBreakdown[chain] = (finalOnChainMcapBreakdown[chain] || 0) + value
				totalOnChainMcapForAsset += value
				if (selectedChain && rwaSlug(chain) === selectedChain) {
					hasSelectedChainInOnChainMcap = true
					filteredOnChainMcapForAsset += value
				}
			}

			// Track total TVL for each chain for the chains list so order stays consistent
			for (const chain of item.chain ?? []) {
				chainNavValues.set(chain, (chainNavValues.get(chain) ?? 0) + totalOnChainMcapForAsset)
			}

			// For category navigation, we always use total on-chain mcap (not filtered) so ordering stays consistent.
			for (const category of item.category ?? []) {
				categoryNavValues.set(category, (categoryNavValues.get(category) ?? 0) + totalOnChainMcapForAsset)
			}

			// For platform navigation, we always use total on-chain mcap (not filtered) so ordering stays consistent.
			if (item.parentPlatform) {
				platformNavValues.set(
					item.parentPlatform,
					(platformNavValues.get(item.parentPlatform) ?? 0) + totalOnChainMcapForAsset
				)
			}

			for (const chain in activeMcapBreakdown) {
				const value = safeNumber(activeMcapBreakdown[chain])
				finalActiveMcapBreakdown[chain] = (finalActiveMcapBreakdown[chain] || 0) + value
				totalActiveMcapForAsset += value
				if (selectedChain && rwaSlug(chain) === selectedChain) {
					hasSelectedChainInActiveMcap = true
					filteredActiveMcapForAsset += value
				}
			}

			for (const chain in defiActiveTvlBreakdown) {
				const isSelectedChain = !isChainFiltered || rwaSlug(chain) === selectedChain
				if (selectedChain && isSelectedChain) {
					// Chain exists as a key in the object, even if its value totals to 0.
					hasSelectedChainInDeFiActiveTvl = true
				}
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
				? hasSelectedChainInOnChainMcap || hasSelectedChainInActiveMcap || hasSelectedChainInDeFiActiveTvl
				: true

			// Use filtered values if chain is selected, otherwise use totals
			const effectiveOnChainMcap = selectedChain ? filteredOnChainMcapForAsset : totalOnChainMcapForAsset
			const effectiveActiveMcap = selectedChain ? filteredActiveMcapForAsset : totalActiveMcapForAsset
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
				...item,
				ticker: typeof item.ticker === 'string' && item.ticker !== '-' ? item.ticker : null,
				name: typeof item.name === 'string' && item.name !== '-' ? item.name : null,
				rwaClassification: isTrueRWA ? 'RWA' : (item.rwaClassification ?? null),
				trueRWA: isTrueRWA,
				category: sortedCategories,
				onChainMcap: {
					total: effectiveOnChainMcap,
					breakdown: Object.entries(finalOnChainMcapBreakdown)
						.filter(([chain]) => !selectedChain || rwaSlug(chain) === selectedChain)
						.sort((a, b) => b[1] - a[1])
				},
				activeMcap: {
					total: effectiveActiveMcap,
					breakdown: Object.entries(finalActiveMcapBreakdown)
						.filter(([chain]) => !selectedChain || rwaSlug(chain) === selectedChain)
						.sort((a, b) => b[1] - a[1])
				},
				defiActiveTvl: {
					total: effectiveDeFiActiveTvl,
					breakdown: Object.entries(
						isChainFiltered ? finalDeFiActiveTvlBreakdownFiltered : finalDeFiActiveTvlBreakdown
					).sort((a, b) => b[1] - a[1])
				}
			}

			// Only include asset if it exists on the selected chain/category (or no route filter)
			if (hasChainInTvl && hasCategoryMatch && hasPlatformMatch && asset.name) {
				assets.push(asset)
				// Only expose `assetNames` when filtering by platform (used for platform-level UI filters).
				if (selectedPlatform) {
					assetNames.set(asset.name, (assetNames.get(asset.name) ?? 0) + effectiveOnChainMcap)
				}

				// Track total values
				totalOnChainMcapAllAssets += effectiveOnChainMcap
				totalActiveMcapAllAssets += effectiveActiveMcap
				if (item.stablecoin) {
					totalOnChainStablecoinValueAllAssets += effectiveOnChainMcap
				}
				totalOnChainDeFiActiveTvlAllAssets += effectiveDeFiActiveTvl

				// Add to categories/issuers/assetClasses/rwaClassifications/accessModels for assets on this chain
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

		const formattedAssetClasses = Array.from(assetClasses.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		const formattedCategories = Array.from(categories.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => key)

		return {
			assets: assets.sort((a, b) => b.onChainMcap.total - a.onChainMcap.total),
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
			chainLinks:
				selectedCategory || selectedPlatform
					? []
					: [
							{ label: 'All', to: '/rwa' },
							...Array.from(chainNavValues.entries())
								.sort((a, b) => b[1] - a[1])
								.map(([key]) => ({ label: key, to: `/rwa/chain/${rwaSlug(key)}` }))
						],
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
			totalOnChainMcap: totalOnChainMcapAllAssets,
			totalActiveMcap: totalActiveMcapAllAssets,
			totalOnChainStablecoinValue: totalOnChainStablecoinValueAllAssets,
			totalOnChainDeFiActiveTvl: totalOnChainDeFiActiveTvlAllAssets
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA assets overview')
	}
}

export async function getRWAChainsOverview(): Promise<IRWAChainsOverviewRow[]> {
	const data = await fetchJson<IRWAStatsResponse>(RWA_STATS_API)
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
	const data = await fetchJson<IRWAStatsResponse>(RWA_STATS_API)
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
	const data = await fetchJson<IRWAStatsResponse>(RWA_STATS_API)
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

export interface IRWAAssetData extends IRWAProject {
	slug: string
	rwaClassificationDescription: string | null
	accessModelDescription: string | null
	assetClassDescriptions: Record<string, string>
}

export async function getRWAAssetData({ assetId }: { assetId: string }): Promise<IRWAAssetData | null> {
	try {
		const data = await fetchJson<IFetchedRWAProject>(`${RWA_ASSET_DATA_API}/${assetId}`)
		if (!data) {
			throw new Error('Failed to get RWA assets list')
		}

		let totalOnChainMcapForAsset = 0
		let totalActiveMcapForAsset = 0
		let totalDeFiActiveTvlForAsset = 0
		const onChainMcapBreakdown = data.onChainMcap ?? {}
		const activeMcapBreakdown = data.activeMcap ?? {}
		const defiActiveTvlBreakdown = data.defiActiveTvl ?? {}
		const finalOnChainMcapBreakdown: Record<string, number> = {}
		const finalActiveMcapBreakdown: Record<string, number> = {}
		const finalDeFiActiveTvlBreakdown: Record<string, number> = {}

		for (const chain in onChainMcapBreakdown) {
			const value = safeNumber(onChainMcapBreakdown[chain])
			finalOnChainMcapBreakdown[chain] = (finalOnChainMcapBreakdown[chain] || 0) + value
			totalOnChainMcapForAsset += value
		}

		for (const chain in activeMcapBreakdown) {
			const value = safeNumber(activeMcapBreakdown[chain])
			finalActiveMcapBreakdown[chain] = (finalActiveMcapBreakdown[chain] || 0) + value
			totalActiveMcapForAsset += value
		}

		for (const chain in defiActiveTvlBreakdown) {
			for (const protocolName in defiActiveTvlBreakdown[chain]) {
				const value = safeNumber(defiActiveTvlBreakdown[chain][protocolName])
				finalDeFiActiveTvlBreakdown[protocolName] = (finalDeFiActiveTvlBreakdown[protocolName] || 0) + value
				totalDeFiActiveTvlForAsset += value
			}
		}

		const isTrueRWA = data.rwaClassification === 'True RWA'
		// Get the classification description - use True RWA definition if trueRWA flag
		const classificationKey = isTrueRWA ? 'True RWA' : data.rwaClassification
		const rwaClassificationDescription = classificationKey
			? (definitions.rwaClassification.values?.[classificationKey] ?? null)
			: null

		const accessModelDescription = definitions.accessModel.values?.[data.accessModel] ?? null
		// Get asset class descriptions
		const assetClassDescriptions: Record<string, string> = {}
		for (const ac of data.assetClass ?? []) {
			const description = ac ? definitions.assetClass.values?.[ac] : null
			if (description) {
				assetClassDescriptions[ac] = description
			}
		}

		const ticker = typeof data.ticker === 'string' && data.ticker !== '-' ? data.ticker : null
		const name = typeof data.name === 'string' && data.name !== '-' ? data.name : null

		if (!ticker) {
			return null
		}

		return {
			...data,
			slug: rwaSlug(ticker ?? name ?? ''),
			ticker,
			name,
			trueRWA: isTrueRWA,
			rwaClassification: isTrueRWA ? 'RWA' : (data.rwaClassification ?? null),
			rwaClassificationDescription,
			accessModelDescription,
			assetClassDescriptions,
			onChainMcap: {
				total: totalOnChainMcapForAsset,
				breakdown: Object.entries(finalOnChainMcapBreakdown).sort((a, b) => b[1] - a[1])
			},
			activeMcap: {
				total: totalActiveMcapForAsset,
				breakdown: Object.entries(finalActiveMcapBreakdown).sort((a, b) => b[1] - a[1])
			},
			defiActiveTvl: {
				total: totalDeFiActiveTvlForAsset,
				breakdown: Object.entries(finalDeFiActiveTvlBreakdown).sort((a, b) => b[1] - a[1])
			}
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA asset data')
	}
}

function safeNumber(value: unknown): number {
	const n = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(n) ? n : 0
}
