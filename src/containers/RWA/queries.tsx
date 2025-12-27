import { RWA_ACTIVE_TVLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'

interface IFetchedRWAProject {
	projectID: string | false
	Ticker: string
	Name: string
	Website: string
	'Primary Chain': string
	Chain: string | string[]
	Contracts: string | string[]
	Category: string | string[]
	'Asset Class': string | string[]
	Type: string
	Issuer: string
	'Issuer Source Link': string
	'Issuer Registry Info': string | string[]
	Redeemable: boolean | string
	Attestations: boolean | string
	'CEX Listed': boolean | string
	KYC: boolean | string | string[]
	Transferable: boolean | string
	'Self Custody': boolean | string
	Notes: string | string[]
	'Active TVL': boolean | string
	'DeFi Active TVL': Record<string, Record<string, string>>
	Derivatives: boolean | string | string[]
	'RWA Classification': string
	'Access Model': string
	'Coingecko ID': string
	'Coinmarketcap ID': string
	'Pool ID': string | string[]
	Twitter: string
	ISIN: string
	'On-chain TVL': Record<string, string>
}

interface INormalizedRWAProject {
	projectID: string | null
	Ticker: string
	Name: string | null
	Website: string[] | null
	'Primary Chain': string | null
	Chain: string[]
	Contracts: string[]
	Category: string[] | null
	'Asset Class': string[] | null
	Type: string | null
	Issuer: string | null
	'Issuer Source Link': string | null
	'Issuer Registry Info': string[] | null
	Redeemable: boolean | null
	Attestations: boolean | null
	'CEX Listed': boolean | null
	KYC: boolean | string[] | null
	Transferable: boolean | null
	'Self Custody': boolean | null
	Notes: string[] | null
	'Active TVL': string[] | null
	Derivatives: false | string[] | null
	'RWA Classification': string | null
	'Access Model': string | null
	'Coingecko ID': string | null
	'Coinmarketcap ID': null
	'Pool ID': string[] | null
	Twitter: string | null
	ISIN: string | null
	'On-chain TVL': {
		total: number
		breakdown: Array<[string, number]>
	}
	'DeFi Active TVL': {
		total: number
		breakdown: Array<[string, number]>
	}
}

const normalizedRWAProjectProperties = {
	projectID: 'projectId',
	Ticker: 'ticker',
	Name: 'name',
	Website: 'website',
	'Primary Chain': 'primaryChain',
	Chain: 'chain',
	Contracts: 'contracts',
	Category: 'category',
	'Asset Class': 'assetClass',
	Type: 'type',
	Issuer: 'issuer',
	'Issuer Source Link': 'issuerSourceLink',
	'Issuer Registry Info': 'issuerRegistryInfo',
	Redeemable: 'redeemable',
	Attestations: 'attestations',
	'CEX Listed': 'cexListed',
	KYC: 'kyc',
	Transferable: 'transferable',
	'Self Custody': 'selfCustody',
	Notes: 'notes',
	'Active TVL': 'activeTvl',
	Derivatives: 'derivatives',
	'RWA Classification': 'rwaClassification',
	'Access Model': 'accessModel',
	'Coingecko ID': 'coingeckoId',
	'Coinmarketcap ID': 'coinmarketcapId',
	'Pool ID': 'poolId',
	Twitter: 'twitter',
	ISIN: 'isin',
	'On-chain TVL': 'onChainMarketcap',
	'DeFi Active TVL': 'defiActiveTvl'
} as const satisfies Record<keyof INormalizedRWAProject, string>

type IRWAProject = {
	[K in keyof INormalizedRWAProject as (typeof normalizedRWAProjectProperties)[K]]: INormalizedRWAProject[K]
}

export interface IRWAAssetsOverview {
	assets: Array<IRWAProject>
	assetClasses: Array<string>
	categories: Array<string>
	issuers: Array<string>
}

const propertiesToFormatAsArray = new Set([
	'Chain',
	'Website',
	'Contracts',
	'Category',
	'Asset Class',
	'Issuer Registry Info',
	'KYC',
	'Notes',
	'Derivatives',
	'Pool ID'
])

const cannotBeBoolean = new Set(['projectID', 'Active TVL', 'Attestations'])

export async function getRWAAssetsOverview(): Promise<IRWAAssetsOverview> {
	try {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const data: Record<string, IFetchedRWAProject> = await fetchJson(RWA_ACTIVE_TVLS_API)
		const assets: Array<IRWAProject> = []
		const assetClasses = new Map<string, number>()
		const categories = new Map<string, number>()
		const issuers = new Map<string, number>()
		for (const rwaId in data) {
			const assetData = {} as IRWAProject
			for (const key in data[rwaId]) {
				const normalizedKey = normalizedRWAProjectProperties[key as keyof INormalizedRWAProject]
				// check if value is truthy, convert empty string to null
				if (data[rwaId][key]) {
					if (propertiesToFormatAsArray.has(key) && typeof data[rwaId][key] === 'string') {
						;(assetData as Record<string, unknown>)[normalizedKey] = [data[rwaId][key]]
					} else {
						;(assetData as Record<string, unknown>)[normalizedKey] = data[rwaId][key]
					}
				} else {
					;(assetData as Record<string, unknown>)[normalizedKey] =
						typeof data[rwaId][key] === 'boolean' && !cannotBeBoolean.has(key) ? false : null
				}
			}

			let totalOnChainTvl = 0
			let totalDeFiActiveTvl = 0
			const onChainTvlBreakdown = data[rwaId]['On-chain TVL'] ?? {}
			const defiActiveTvlBreakdown = data[rwaId]['DeFi Active TVL'] ?? {}
			const finalOnChainTvlBreakdown = {} as Record<string, number>
			const finalDeFiActiveTvlBreakdown = {} as Record<string, number>
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
			assetData.onChainMarketcap = {
				total: totalOnChainTvl,
				breakdown: Object.entries(finalOnChainTvlBreakdown).sort((a, b) => b[1] - a[1])
			}
			assetData.defiActiveTvl = {
				total: totalDeFiActiveTvl,
				breakdown: Object.entries(finalDeFiActiveTvlBreakdown).sort((a, b) => b[1] - a[1])
			}
			assets.push(assetData)

			assetData.assetClass?.forEach((assetClass) => {
				if (assetClass) {
					assetClasses.set(assetClass, (assetClasses.get(assetClass) ?? 0) + totalOnChainTvl)
				}
			})
			assetData.category?.forEach((category) => {
				if (category) {
					categories.set(category, (categories.get(category) ?? 0) + totalOnChainTvl)
				}
			})
			if (assetData.issuer) {
				issuers.set(assetData.issuer, (issuers.get(assetData.issuer) ?? 0) + totalOnChainTvl)
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
