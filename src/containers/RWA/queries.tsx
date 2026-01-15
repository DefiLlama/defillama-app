import { RWA_ACTIVE_TVLS_API } from '~/constants'
import definitions from '~/public/rwa-definitions.json'
import { slug } from '~/utils'
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
	accessModel: string | null
	issuer: string | null
	issuerSourceLink: string | null
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
}

export interface IRWAProject extends Omit<
	IFetchedRWAProject,
	'onChainMarketcap' | 'defiActiveTvl' | 'website' | 'issuerRegistryInfo' | 'accessModel'
> {
	accessModel: 'Permissioned' | 'Permissionless' | 'Non-transferable' | 'Custodial Only' | 'Unknown'
	website: string[] | null
	issuerRegistryInfo: string[] | null
	trueRWA: boolean
	onChainMarketcap: {
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
	categoryValues: Array<{ name: string; value: number }>
	issuers: Array<string>
	chains: Array<{ label: string; to: string }>
	selectedChain: string
	totalOnChainRwaValue: number
	totalOnChainStablecoinValue: number
	totalOnChainDeFiActiveTvl: number
}

export async function getRWAAssetsOverview(selectedChain?: string): Promise<IRWAAssetsOverview | null> {
	try {
		const res: { data: Record<string, IFetchedRWAProject> } = await fetchJson(RWA_ACTIVE_TVLS_API)

		// Find the actual chain name (case-insensitive match) and validate it exists
		let actualChainName: string | null = null
		if (selectedChain) {
			const selectedChainLower = selectedChain.toLowerCase()
			for (const rwaId in res.data) {
				const match = res.data[rwaId].chain?.find((c) => c.toLowerCase() === selectedChainLower)
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
		let totalOnChainRwaValue = 0
		let totalOnChainStablecoinValue = 0
		let totalOnChainDeFiActiveTvl = 0

		for (const rwaId in res.data) {
			const item = res.data[rwaId]

			let totalOnChainTvl = 0
			let totalDeFiActiveTvl = 0
			let filteredOnChainTvl = 0
			let filteredDeFiActiveTvl = 0
			const onChainTvlBreakdown = item.onChainMarketcap ?? {}
			const defiActiveTvlBreakdown = item.defiActiveTvl ?? {}
			const finalOnChainTvlBreakdown: Record<string, number> = {}
			const finalDeFiActiveTvlBreakdown: Record<string, number> = {}

			for (const chain in onChainTvlBreakdown) {
				const value = Number(onChainTvlBreakdown[chain])
				finalOnChainTvlBreakdown[chain] = (finalOnChainTvlBreakdown[chain] || 0) + value
				totalOnChainTvl += value
				if (actualChainName && chain === actualChainName) {
					filteredOnChainTvl += value
				}
			}

			for (const chain in defiActiveTvlBreakdown) {
				for (const protocolName in defiActiveTvlBreakdown[chain]) {
					const value = Number(defiActiveTvlBreakdown[chain][protocolName])
					finalDeFiActiveTvlBreakdown[protocolName] = (finalDeFiActiveTvlBreakdown[protocolName] || 0) + value
					totalDeFiActiveTvl += value
					if (actualChainName && chain === actualChainName) {
						filteredDeFiActiveTvl += value
					}
				}
			}

			// Check if asset has actual TVL on the selected chain (from TVL data, not just chain array)
			const hasChainInTvl = actualChainName ? filteredOnChainTvl > 0 || filteredDeFiActiveTvl > 0 : true

			// Use filtered values if chain is selected, otherwise use totals
			const effectiveOnChainTvl = actualChainName ? filteredOnChainTvl : totalOnChainTvl
			const effectiveDeFiActiveTvl = actualChainName ? filteredDeFiActiveTvl : totalDeFiActiveTvl

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
				accessModel: getAccessModel(item),
				issuer: item.issuer ?? null,
				issuerSourceLink: item.issuerSourceLink ?? null,
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
					total: effectiveOnChainTvl,
					breakdown: Object.entries(finalOnChainTvlBreakdown).sort((a, b) => b[1] - a[1])
				},
				defiActiveTvl: {
					total: effectiveDeFiActiveTvl,
					breakdown: Object.entries(finalDeFiActiveTvlBreakdown).sort((a, b) => b[1] - a[1])
				}
			}

			// Only include asset if it exists on the selected chain (or no chain filter)
			if (hasChainInTvl && asset.name) {
				assets.push(asset)

				// Track total values
				totalOnChainRwaValue += effectiveOnChainTvl
				if (item.stablecoin) {
					totalOnChainStablecoinValue += effectiveOnChainTvl
				}
				totalOnChainDeFiActiveTvl += effectiveDeFiActiveTvl

				// Add to categories/issuers/assetClasses/rwaClassifications/accessModels for assets on this chain
				asset.assetClass?.forEach((assetClass) => {
					if (assetClass) {
						assetClasses.set(assetClass, (assetClasses.get(assetClass) ?? 0) + effectiveOnChainTvl)
					}
				})
				asset.category?.forEach((category) => {
					if (category) {
						categories.set(category, (categories.get(category) ?? 0) + effectiveOnChainTvl)
					}
				})
				if (asset.rwaClassification) {
					rwaClassifications.set(
						asset.rwaClassification,
						(rwaClassifications.get(asset.rwaClassification) ?? 0) + effectiveOnChainTvl
					)
				}
				if (asset.accessModel) {
					accessModels.set(asset.accessModel, (accessModels.get(asset.accessModel) ?? 0) + effectiveOnChainTvl)
				}
				if (asset.issuer) {
					issuers.set(asset.issuer, (issuers.get(asset.issuer) ?? 0) + effectiveOnChainTvl)
				}
			}

			// Chains list always uses total TVL (not filtered) so order stays consistent
			asset.chain?.forEach((chain) => {
				if (chain) {
					chains.set(chain, (chains.get(chain) ?? 0) + totalOnChainTvl)
				}
			})
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
			categories: Array.from(categories.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([key]) => key),
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
			totalOnChainRwaValue,
			totalOnChainStablecoinValue,
			totalOnChainDeFiActiveTvl
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA assets overview')
	}
}

export async function getRWAChainsList(): Promise<string[]> {
	const data: Record<string, IFetchedRWAProject> = await fetchJson(RWA_ACTIVE_TVLS_API)
	const chains = new Set<string>()

	for (const rwaId in data) {
		data[rwaId].chain?.forEach((chain) => {
			if (chain) {
				chains.add(slug(chain))
			}
		})
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
		const res: { data: Record<string, IFetchedRWAProject> } = await fetchJson(RWA_ACTIVE_TVLS_API)

		// Find the asset by comparing ticker slugs
		for (const rwaId in res.data) {
			const item = res.data[rwaId]
			if (slug(item.ticker) === assetSlug) {
				let totalOnChainTvl = 0
				let totalDeFiActiveTvl = 0
				const onChainTvlBreakdown = item.onChainMarketcap ?? {}
				const defiActiveTvlBreakdown = item.defiActiveTvl ?? {}
				const finalOnChainTvlBreakdown: Record<string, number> = {}
				const finalDeFiActiveTvlBreakdown: Record<string, number> = {}

				for (const chain in onChainTvlBreakdown) {
					const value = Number(onChainTvlBreakdown[chain])
					finalOnChainTvlBreakdown[chain] = (finalOnChainTvlBreakdown[chain] || 0) + value
					totalOnChainTvl += value
				}

				for (const chain in defiActiveTvlBreakdown) {
					for (const protocolName in defiActiveTvlBreakdown[chain]) {
						const value = Number(defiActiveTvlBreakdown[chain][protocolName])
						finalDeFiActiveTvlBreakdown[protocolName] = (finalDeFiActiveTvlBreakdown[protocolName] || 0) + value
						totalDeFiActiveTvl += value
					}
				}

				const isTrueRWA = item.rwaClassification === 'True RWA'
				// Get the classification description - use True RWA definition if trueRWA flag
				const classificationKey = isTrueRWA ? 'True RWA' : item.rwaClassification
				const rwaClassificationDescription = classificationKey
					? (definitions.rwaClassification.values?.[classificationKey] ?? null)
					: null
				// Get access model and its description
				const accessModel = getAccessModel(item)
				const accessModelDescription = definitions.accessModel.values?.[accessModel] ?? null
				// Get asset class descriptions
				const assetClassDescriptions: Record<string, string> = {}
				item.assetClass?.forEach((ac) => {
					const description = ac ? definitions.assetClass.values?.[ac] : null
					if (description) {
						assetClassDescriptions[ac] = description
					}
				})
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
					issuerSourceLink: item.issuerSourceLink ?? null,
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
						total: totalOnChainTvl,
						breakdown: Object.entries(finalOnChainTvlBreakdown).sort((a, b) => b[1] - a[1])
					},
					defiActiveTvl: {
						total: totalDeFiActiveTvl,
						breakdown: Object.entries(finalDeFiActiveTvlBreakdown).sort((a, b) => b[1] - a[1])
					}
				}
			}
		}

		return null
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA asset data')
	}
}

export async function getRWAAssetsList(): Promise<string[]> {
	const data: Record<string, IFetchedRWAProject> = await fetchJson(RWA_ACTIVE_TVLS_API)
	const assets: string[] = []

	for (const rwaId in data) {
		if (data[rwaId].ticker) {
			assets.push(slug(data[rwaId].ticker))
		}
	}

	return assets
}

function getAccessModel(
	asset: IFetchedRWAProject
): 'Permissioned' | 'Permissionless' | 'Non-transferable' | 'Custodial Only' | 'Unknown' {
	if (asset.kycAllowlistedWhitelistedToTransferHold) {
		return 'Permissioned'
	}

	if (asset.transferable && asset.selfCustody) {
		return 'Permissionless'
	}

	if (!asset.transferable && asset.selfCustody) {
		return 'Non-transferable'
	}

	if (asset.transferable != null && !asset.transferable && asset.selfCustody != null && !asset.selfCustody) {
		return 'Custodial Only'
	}

	return 'Unknown'
}
