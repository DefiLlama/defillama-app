import { RWA_ACTIVE_TVLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'

interface IFetchedRWAProject {
	ticker: string
	name: string
	website: string | string[] | null
	twitter: string | null
	primaryChain: string | null
	chain: string[] | null
	contracts: string[] | null
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
	kyc: boolean | string[] | null
	transferable: boolean | null
	selfCustody: boolean | null
	descriptionNotes: string | null
	parentPlatform: string | null
	stablecoin: boolean | null
	defiActiveTvl: Record<string, Record<string, string>> | null
	onChainMarketcap: Record<string, string> | null
}

export interface IRWAProject
	extends Omit<IFetchedRWAProject, 'onChainMarketcap' | 'defiActiveTvl' | 'website' | 'issuerRegistryInfo'> {
	website: string[] | null
	issuerRegistryInfo: string[] | null
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
	categories: Array<string>
	issuers: Array<string>
}

export async function getRWAAssetsOverview(): Promise<IRWAAssetsOverview> {
	try {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const data: Record<string, IFetchedRWAProject> = await fetchJson(RWA_ACTIVE_TVLS_API)
		const assets: Array<IRWAProject> = []
		const assetClasses = new Map<string, number>()
		const categories = new Map<string, number>()
		const issuers = new Map<string, number>()

		for (const rwaId in data) {
			const item = data[rwaId]

			let totalOnChainTvl = 0
			let totalDeFiActiveTvl = 0
			const onChainTvlBreakdown = item.onChainMarketcap ?? {}
			const defiActiveTvlBreakdown = item.defiActiveTvl ?? {}
			const finalOnChainTvlBreakdown: Record<string, number> = {}
			const finalDeFiActiveTvlBreakdown: Record<string, number> = {}

			for (const chain in onChainTvlBreakdown) {
				finalOnChainTvlBreakdown[chain] = (finalOnChainTvlBreakdown[chain] || 0) + Number(onChainTvlBreakdown[chain])
				totalOnChainTvl += Number(onChainTvlBreakdown[chain])
			}

			for (const chain in defiActiveTvlBreakdown) {
				for (const protocol in defiActiveTvlBreakdown[chain]) {
					const protocolName = metadataCache.protocolMetadata[protocol]?.displayName ?? `unknown#${protocol}`
					finalDeFiActiveTvlBreakdown[protocolName] =
						(finalDeFiActiveTvlBreakdown[protocolName] || 0) + Number(defiActiveTvlBreakdown[chain][protocol])
					totalDeFiActiveTvl += Number(defiActiveTvlBreakdown[chain][protocol])
				}
			}

			const asset: IRWAProject = {
				ticker: item.ticker,
				name: item.name,
				website: item.website == null ? null : Array.isArray(item.website) ? item.website : [item.website],
				twitter: item.twitter,
				primaryChain: item.primaryChain,
				chain: item.chain,
				contracts: item.contracts,
				category: item.category,
				assetClass: item.assetClass,
				type: item.type,
				rwaClassification: item.rwaClassification,
				accessModel: item.accessModel,
				issuer: item.issuer,
				issuerSourceLink: item.issuerSourceLink,
				issuerRegistryInfo:
					item.issuerRegistryInfo == null
						? null
						: Array.isArray(item.issuerRegistryInfo)
							? item.issuerRegistryInfo
							: [item.issuerRegistryInfo],
				isin: item.isin,
				attestationLinks: item.attestationLinks,
				attestations: item.attestations,
				redeemable: item.redeemable,
				cexListed: item.cexListed,
				kyc: item.kyc,
				transferable: item.transferable,
				selfCustody: item.selfCustody,
				descriptionNotes: item.descriptionNotes,
				parentPlatform: item.parentPlatform,
				stablecoin: item.stablecoin,
				onChainMarketcap: {
					total: totalOnChainTvl,
					breakdown: Object.entries(finalOnChainTvlBreakdown).sort((a, b) => b[1] - a[1])
				},
				defiActiveTvl: {
					total: totalDeFiActiveTvl,
					breakdown: Object.entries(finalDeFiActiveTvlBreakdown).sort((a, b) => b[1] - a[1])
				}
			}

			assets.push(asset)

			asset.assetClass?.forEach((assetClass) => {
				if (assetClass) {
					assetClasses.set(assetClass, (assetClasses.get(assetClass) ?? 0) + totalOnChainTvl)
				}
			})
			asset.category?.forEach((category) => {
				if (category) {
					categories.set(category, (categories.get(category) ?? 0) + totalOnChainTvl)
				}
			})
			if (asset.issuer) {
				issuers.set(asset.issuer, (issuers.get(asset.issuer) ?? 0) + totalOnChainTvl)
			}
		}

		return {
			assets: assets.sort((a, b) => b.onChainMarketcap.total - a.onChainMarketcap.total),
			assetClasses: Array.from(assetClasses.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([key]) => key),
			categories: Array.from(categories.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([key]) => key),
			issuers: Array.from(issuers.entries())
				.sort((a, b) => b[1] - a[1])
				.map(([key]) => key)
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get RWA assets overview')
	}
}
