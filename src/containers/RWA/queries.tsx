import { RWA_ACTIVE_TVLS_API } from '~/constants'
import definitions from '~/public/rwa-definitions.json'
import { formatNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'

interface IFetchedRWAProject {
	ticker: string
	name: string
	website: string | string[] | null
	twitter: string | null
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
	| 'issuerRegistryInfo'
	| 'accessModel'
	| 'issuerSourceLink'
> {
	accessModel: 'Permissioned' | 'Permissionless' | 'Non-transferable' | 'Custodial Only' | 'Unknown'
	website: string[] | null
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
	stablecoinCategories: Array<string>
	stablecoinAssetClasses: Array<string>
	stablecoinClassifications: Array<string>
	governanceCategories: Array<string>
	governanceAssetClasses: Array<string>
	governanceClassifications: Array<string>
	categoryValues: Array<{ name: string; value: number }>
	issuers: Array<string>
	chains: Array<{ label: string; to: string }>
	selectedChain: string
	totalOnChainMarketcap: number
	totalActiveMarketcap: number
	totalOnChainStablecoinValue: number
	totalOnChainDeFiActiveTvl: number
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

export async function getRWAAssetsOverview(selectedChain?: string): Promise<IRWAAssetsOverview | null> {
	try {
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
				const match = data[rwaId].chain?.find((c) => slug(c) === selectedChain)
				if (match) {
					actualChainName = match
					break
				}
			}
			if (!actualChainName) {
				return null
			}
		}

		const assets: Array<IRWAProject> = []
		const assetClasses = new Map<string, number>()
		const rwaClassifications = new Map<string, number>()
		const accessModels = new Map<string, number>()
		const categories = new Map<string, number>()
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

			for (const chain in onChainMarketcapBreakdown) {
				const value = safeNumber(onChainMarketcapBreakdown[chain])
				finalOnChainMarketcapBreakdown[chain] = (finalOnChainMarketcapBreakdown[chain] || 0) + value
				totalOnChainMarketcapForAsset += value
				if (selectedChain && slug(chain) === selectedChain) {
					filteredOnChainMarketcapForAsset += value
				}
			}

			for (const chain in activeMarketcapBreakdown) {
				const value = safeNumber(activeMarketcapBreakdown[chain])
				finalActiveMarketcapBreakdown[chain] = (finalActiveMarketcapBreakdown[chain] || 0) + value
				totalActiveMarketcapForAsset += value
				if (selectedChain && slug(chain) === selectedChain) {
					filteredActiveMarketcapForAsset += value
				}
			}

			for (const chain in defiActiveTvlBreakdown) {
				const isSelectedChain = !isChainFiltered || slug(chain) === selectedChain
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
			const asset: IRWAProject = {
				ticker: typeof item.ticker === 'string' && item.ticker !== '-' ? item.ticker : null,
				name: typeof item.name === 'string' && item.name !== '-' ? item.name : null,
				website: item.website == null ? null : Array.isArray(item.website) ? item.website : [item.website],
				twitter: item.twitter ?? null,
				primaryChain: item.primaryChain ?? null,
				chain: item.chain ?? null,
				contracts: item.contracts ?? null,
				category: item.category ?? null,
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
						.filter(([chain]) => !selectedChain || slug(chain) === selectedChain)
						.sort((a, b) => b[1] - a[1])
				},
				activeMarketcap: {
					total: effectiveActiveMarketcap,
					breakdown: Object.entries(finalActiveMarketcapBreakdown)
						.filter(([chain]) => !selectedChain || slug(chain) === selectedChain)
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

			// Only include asset if it exists on the selected chain (or no chain filter)
			if (hasChainInTvl && asset.name) {
				assets.push(asset)

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
			chains: [
				{ label: 'All', to: '/rwa' },
				...Array.from(chains.entries())
					.sort((a, b) => b[1] - a[1])
					.map(([key]) => ({ label: key, to: `/rwa/chain/${slug(key)}` }))
			],
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
				chains.add(slug(chain))
			}
		}
	}

	return Array.from(chains)
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
					twitter: item.twitter ?? null,
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
