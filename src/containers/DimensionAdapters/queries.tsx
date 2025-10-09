import { getAnnualizedRatio } from '~/api/categories/adaptors'
import { PROTOCOLS_API, REV_PROTOCOLS, V2_SERVER_URL, ZERO_FEE_PERPS } from '~/constants'
import { chainIconUrl, slug, tokenIconUrl } from '~/utils'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { ADAPTER_DATA_TYPE_KEYS, ADAPTER_DATA_TYPES, ADAPTER_TYPES, ADAPTER_TYPES_TO_METADATA_TYPE } from './constants'
import { IAdapterByChainPageData, IChainsByAdapterPageData, IChainsByREVPageData } from './types'

export interface IAdapterOverview {
	totalDataChart: Array<[number, number]> // date, value
	totalDataChartBreakdown: Array<[number, Record<string, number>]> // date , {chain: value}
	breakdown24h: number | null
	chain: string | null
	allChains: Array<string>
	total24h: number
	total48hto24h: number
	total7d: number
	total14dto7d: number
	total60dto30d: number
	total30d: number
	total1y: number
	change_1d: number
	change_7d: number
	change_1m: number
	change_7dover7d: number
	change_30dover30d: number
	total7DaysAgo: number
	total30DaysAgo: number
	protocols: Array<{
		total24h: number
		total48hto24h: number
		total7d: number
		total14dto7d: number
		total60dto30d: number
		total30d: number
		total1y: number
		totalAllTime: number
		average1y: number
		monthlyAverage1y: number
		change_1d: number
		change_7d: number
		change_1m: number
		change_7dover7d: number
		change_30dover30d: number
		breakdown24h: Record<string, Record<string, number>>
		breakdown30d: Record<string, Record<string, number>>
		total7DaysAgo: number
		total30DaysAgo: number
		defillamaId: string
		name: string
		displayName: string
		module: string
		category: string
		logo: string
		chains: Array<string>
		protocolType: string
		methodologyURL: string
		methodology: Record<string, string>
		latestFetchIsOk: boolean
		parentProtocol: string
		slug: string
		linkedProtocols: Array<string>
		id: string
		doublecounted?: boolean
	}>
}

export interface IAdapterSummary {
	name: string
	defillamaId: string
	disabled: boolean
	displayName: string
	module: string
	category?: string | null
	logo: string | null
	chains: Array<string>
	methodologyURL: string
	methodology: Record<string, string>
	gecko_id: string | null
	forkedFrom?: Array<string> | null
	twitter?: string | null
	audits?: string | null
	description: string | null
	address?: string | null
	url: string
	audit_links?: Array<string> | null
	versionKey: string | null
	cmcId: string | null
	id: string
	github: Array<string>
	governanceID: null
	treasury: null
	parentProtocol?: string | null
	previousNames?: string | null
	latestFetchIsOk: boolean
	slug: string
	protocolType?: string | null
	total24h?: number | null
	total48hto24h?: number | null
	total7d?: number | null
	total30d?: number | null
	totalAllTime?: number | null
	totalDataChartBreakdown: Array<[number, Record<string, Record<string, number>>]>
	totalDataChart: Array<[number, number]>
	linkedProtocols?: string[]
	defaultChartView?: 'daily' | 'weekly' | 'monthly'
	doublecounted?: boolean
	hasLabelBreakdown?: boolean
	breakdownMethodology?: Record<string, Record<string, string>>
	childProtocols?: Array<{
		name: string
		defillamaId: string
		displayName: string
		methodologyURL: string
		methodology: Record<string, string>
		breakdownMethodology: Record<string, Record<string, string>>
	}>
}

//breakdown is using chain internal name so we need to map it
let chainMappingCache: Record<string, string> | null = null

async function getChainMapping() {
	if (chainMappingCache) {
		return chainMappingCache
	}

	try {
		const mapping = await fetchJson('https://api.llama.fi/overview/_internal/chain-name-id-map')
		chainMappingCache = mapping
		return mapping
	} catch (error) {
		console.warn('Failed to fetch chain mapping, falling back to toLowerCase conversion')
		return {}
	}
}

function getInternalChainName(displayChain: string, chainMapping: Record<string, string>) {
	const mapped = Object.entries(chainMapping).find(([display, internal]) => display === displayChain)?.[1]
	if (mapped) return mapped
	return slug(displayChain)
}

export async function getAdapterChainOverview({
	adapterType,
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
}) {
	if (dataType !== 'dailyEarnings') {
		let url = `${V2_SERVER_URL}/${adapterType}/overview${
			chain && chain !== 'All' ? `/${slug(chain)}` : ''
		}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`

		if (dataType) {
			url += `&dataType=${dataType}`
		}

		const data = await fetchJson(url, { timeout: 30_000 })

		return data as IAdapterOverview
	} else {
		//earnings we don't need to filter by chain, instead we filter it later on
		let url = `${V2_SERVER_URL}/${adapterType}/overview?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`

		if (dataType) {
			url += `&dataType=dailyRevenue`
		}

		const [data, emissionsData, chainMapping] = await Promise.all([
			fetchJson(url),
			getEmissionsData(),
			getChainMapping()
		])

		const earningsData = processEarningsData(data, emissionsData)

		let filteredEarningsData = earningsData
		let chainSpecificTotal24h = 0
		let chainSpecificTotal7d = 0
		let chainSpecificTotal30d = 0
		let chainSpecificTotal1y = 0

		if (chain && chain !== 'All') {
			const internalChainName = getInternalChainName(chain, chainMapping)

			filteredEarningsData = earningsData
				.filter((protocol) => {
					return protocol.breakdown24h && protocol.breakdown24h[internalChainName]
				})
				.map((protocol) => {
					const chainRevenue24h: number = protocol.breakdown24h?.[internalChainName]
						? (Object.values(protocol.breakdown24h[internalChainName]) as number[]).reduce(
								(sum: number, val: number) => sum + (val || 0),
								0
							)
						: 0
					const chainRevenue30d: number = protocol.breakdown30d?.[internalChainName]
						? (Object.values(protocol.breakdown30d[internalChainName]) as number[]).reduce(
								(sum: number, val: number) => sum + (val || 0),
								0
							)
						: 0

					const totalRevenue24h: number = (
						Object.values(protocol.breakdown24h || {}) as Record<string, number>[]
					).reduce(
						(sum: number, chainData) =>
							sum +
							(Object.values(chainData as Record<string, number>) as number[]).reduce(
								(s: number, v: number) => s + (v || 0),
								0
							),
						0
					)
					const totalRevenue30d: number = (
						Object.values(protocol.breakdown30d || {}) as Record<string, number>[]
					).reduce(
						(sum: number, chainData) =>
							sum +
							(Object.values(chainData as Record<string, number>) as number[]).reduce(
								(s: number, v: number) => s + (v || 0),
								0
							),
						0
					)

					const chainRevenueRatio24h = totalRevenue24h > 0 ? chainRevenue24h / totalRevenue24h : 0
					const chainRevenueRatio30d = totalRevenue30d > 0 ? chainRevenue30d / totalRevenue30d : 0

					const emissions = protocol._emissions

					const chainEmissions24h = (emissions?.emission24h || 0) * chainRevenueRatio24h
					const chainEmissions30d = (emissions?.emission30d || 0) * chainRevenueRatio30d

					const chainEarnings24h = chainRevenue24h - chainEmissions24h
					const chainEarnings30d = chainRevenue30d - chainEmissions30d

					chainSpecificTotal24h += chainEarnings24h
					chainSpecificTotal30d += chainEarnings30d

					return {
						...protocol,
						//use chain earnings (revenue - emissions)
						total24h: chainEarnings24h,
						total30d: chainEarnings30d
					}
				})
		} else {
			chainSpecificTotal24h = earningsData.reduce((sum, p) => sum + (p.total24h ?? 0), 0)
			chainSpecificTotal7d = earningsData.reduce((sum, p) => sum + (p.total7d ?? 0), 0)
			chainSpecificTotal30d = earningsData.reduce((sum, p) => sum + (p.total30d ?? 0), 0)
			chainSpecificTotal1y = earningsData.reduce((sum, p) => sum + (p.total1y ?? 0), 0)
			filteredEarningsData = earningsData
		}

		return {
			...data,
			chain,
			total24h: chainSpecificTotal24h,
			total7d: chainSpecificTotal7d,
			total30d: chainSpecificTotal30d,
			total1y: chainSpecificTotal1y,
			protocols: filteredEarningsData
		}
	}
}

export async function getAdapterProtocolSummary({
	adapterType,
	protocol,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	protocol: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
	dataType?: `${ADAPTER_DATA_TYPES}`
}) {
	if (protocol == 'All') throw new Error('Protocol cannot be All')

	let url = `${V2_SERVER_URL}/${adapterType}/protocol/${slug(protocol)}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`

	if (dataType) {
		url += `&dataType=${dataType}`
	}

	const data = await fetchJson(url)

	return data as IAdapterSummary
}

export async function getCexVolume() {
	const [cexs, btcPriceRes] = await Promise.all([
		fetchJson(
			`https://api.llama.fi/cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/exchanges?per_page=250'
			)}`
		),
		fetchJson(
			`https://api.llama.fi/cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
			)}`
		)
	])
	const btcPrice = btcPriceRes?.bitcoin?.usd
	if (!btcPrice || !cexs || typeof cexs.filter !== 'function') return undefined
	// cexs might not be a list TypeError: cexs.filter is not a function
	const volume = cexs.filter((c) => c.trust_score >= 9).reduce((sum, c) => sum + c.trade_volume_24h_btc, 0) * btcPrice
	return volume
}

async function getEmissionsData() {
	const data = await fetchJson('https://api.llama.fi/emissionsBreakdownAggregated')
	return data
}

function findEmissionsForProtocol(protocolVersions: any[], emissionsData: any) {
	const parentKey = protocolVersions[0].parentProtocol || protocolVersions[0].defillamaId

	let emissions = emissionsData.protocols.find((p) => {
		if (p.defillamaId === parentKey) return true
		if (protocolVersions.some((pv) => p.defillamaId === pv.defillamaId)) return true
		if (p.linked && protocolVersions.some((pv) => p.linked.includes(pv.defillamaId))) return true
		return false
	})

	// Special case for Chain category protocols
	if (!emissions && protocolVersions.length === 1 && protocolVersions[0].category === 'Chain') {
		const protocol = protocolVersions[0]
		emissions = emissionsData.protocols.find((p) => p.name === protocol.name || p.name === protocol.displayName)
	}

	return emissions
}

function calculateEarnings(protocolData: any, emissions: any) {
	return {
		...protocolData,
		total24h: (protocolData.total24h ?? 0) - (emissions?.emission24h ?? 0),
		total7d: (protocolData.total7d ?? 0) - (emissions?.emission7d ?? 0),
		total30d: (protocolData.total30d ?? 0) - (emissions?.emission30d ?? 0),
		total1y: (protocolData.total1y ?? 0) - (emissions?.emission1y ?? 0),
		totalAllTime: (protocolData.totalAllTime ?? 0) - (emissions?.emissionAllTime ?? 0),
		_emissions: emissions
	}
}

function aggregateProtocolVersions(protocolVersions: any[]) {
	const aggregatedRevenue = {
		total24h: protocolVersions.reduce((sum, p) => sum + (p.total24h ?? 0), 0),
		total7d: protocolVersions.reduce((sum, p) => sum + (p.total7d ?? 0), 0),
		total30d: protocolVersions.reduce((sum, p) => sum + (p.total30d ?? 0), 0),
		total1y: protocolVersions.reduce((sum, p) => sum + (p.total1y ?? 0), 0),
		totalAllTime: protocolVersions.reduce((sum, p) => sum + (p.totalAllTime ?? 0), 0)
	}

	const mergedBreakdown24h = mergeBreakdowns(protocolVersions.map((p) => p.breakdown24h).filter(Boolean))
	const mergedBreakdown30d = mergeBreakdowns(protocolVersions.map((p) => p.breakdown30d).filter(Boolean))

	const parentProtocol = protocolVersions[0]
	return {
		...parentProtocol,
		name: parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.name,
		displayName: parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.displayName,
		slug: slug(parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.name),
		...aggregatedRevenue,
		chains: [...new Set(protocolVersions.flatMap((p) => p.chains))],
		breakdown24h: mergedBreakdown24h,
		breakdown30d: mergedBreakdown30d,
		linkedProtocols: undefined,
		parentProtocol: undefined
	}
}

function mergeBreakdowns(breakdowns: Record<string, Record<string, number>>[]) {
	const merged = {}
	for (const breakdown of breakdowns) {
		if (!breakdown) continue
		for (const [chainName, protocolData] of Object.entries(breakdown)) {
			if (!merged[chainName]) {
				merged[chainName] = {}
			}
			for (const [protocolName, value] of Object.entries(protocolData)) {
				merged[chainName][protocolName] = (merged[chainName][protocolName] || 0) + value
			}
		}
	}
	return merged
}

function groupProtocolsByParent(protocols: any[]) {
	const protocolGroups = new Map<string, any[]>()

	for (const protocol of protocols) {
		const parentKey = protocol.parentProtocol || protocol.defillamaId
		if (!protocolGroups.has(parentKey)) {
			protocolGroups.set(parentKey, [])
		}
		protocolGroups.get(parentKey)!.push(protocol)
	}

	return protocolGroups
}

function processGroupedProtocols(
	protocolGroups: Map<string, any[]>,
	processor: (protocolVersions: any[], parentKey: string) => any
) {
	const processedData = []
	for (const [parentKey, protocolVersions] of protocolGroups) {
		processedData.push(processor(protocolVersions, parentKey))
	}
	return processedData
}

function processEarningsData(data: IAdapterOverview, emissionsData: any) {
	const protocolGroups = groupProtocolsByParent(data.protocols)

	return processGroupedProtocols(protocolGroups, (protocolVersions, parentKey) => {
		const emissions = findEmissionsForProtocol(protocolVersions, emissionsData)

		if (protocolVersions.length === 1) {
			return calculateEarnings(protocolVersions[0], emissions)
		} else {
			const aggregatedProtocol = aggregateProtocolVersions(protocolVersions)
			return calculateEarnings(aggregatedProtocol, emissions)
		}
	})
}

function processRevenueDataForMatching(protocols: any[]) {
	const protocolGroups = groupProtocolsByParent(protocols)

	return processGroupedProtocols(protocolGroups, (protocolVersions, parentKey) => {
		if (protocolVersions.length === 1) {
			return {
				...protocolVersions[0],
				parentKey,
				groupedName:
					protocolVersions[0].linkedProtocols?.[0] || protocolVersions[0].parentProtocol || protocolVersions[0].name
			}
		} else {
			const aggregatedProtocol = aggregateProtocolVersions(protocolVersions)
			return {
				...aggregatedProtocol,
				parentKey,
				groupedName:
					aggregatedProtocol.linkedProtocols?.[0] || aggregatedProtocol.parentProtocol || aggregatedProtocol.name
			}
		}
	})
}

function matchRevenueToEarnings(revenueData: any[], earningsProtocols: any[]) {
	const matchedData = {}

	revenueData.forEach((revenueProtocol) => {
		const matchingEarningsProtocol = earningsProtocols.find((earningsProto) => {
			const earningsParentKey = earningsProto.parentProtocol || earningsProto.defillamaId

			return (
				earningsParentKey === revenueProtocol.parentKey ||
				earningsProto.name === revenueProtocol.name ||
				earningsProto.displayName === revenueProtocol.displayName ||
				earningsProto.defillamaId === revenueProtocol.defillamaId ||
				earningsProto.name === revenueProtocol.groupedName ||
				earningsProto.displayName === revenueProtocol.groupedName
			)
		})

		if (matchingEarningsProtocol) {
			matchedData[matchingEarningsProtocol.name] = {
				total24h: revenueProtocol.total24h ?? null,
				total7d: revenueProtocol.total7d ?? null,
				total30d: revenueProtocol.total30d ?? null,
				total1y: revenueProtocol.total1y ?? null,
				totalAllTime: revenueProtocol.totalAllTime ?? null
			}
		}
	})

	return matchedData
}

export const getAdapterByChainPageData = async ({
	adapterType,
	chain,
	dataType,
	route
}: {
	adapterType: `${ADAPTER_TYPES}`
	chain: string
	dataType?: `${ADAPTER_DATA_TYPES}` | 'dailyEarnings'
	route: string
}): Promise<IAdapterByChainPageData | null> => {
	const [data, protocolsData, bribesData, tokenTaxesData]: [
		IAdapterOverview,
		{
			protocols: Array<{ name: string; mcap: number | null }>
			parentProtocols: Array<{ name: string; mcap: number | null }>
		},
		IAdapterOverview | null,
		IAdapterOverview | null
	] = await Promise.all([
		getAdapterChainOverview({
			adapterType,
			chain,
			dataType,
			excludeTotalDataChart: false,
			excludeTotalDataChartBreakdown: true
		}),
		fetchJson(PROTOCOLS_API),
		adapterType === 'fees'
			? getAdapterChainOverview({
					adapterType,
					chain,
					dataType: 'dailyBribesRevenue',
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
				})
			: Promise.resolve(null),
		adapterType === 'fees'
			? getAdapterChainOverview({
					adapterType,
					chain,
					dataType: 'dailyTokenTaxes',
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
				})
			: Promise.resolve(null)
	])

	const protocolsMcap = {}
	for (const protocol of protocolsData.protocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}
	for (const protocol of protocolsData.parentProtocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}

	const allProtocols = [...data.protocols]

	let bribesProtocols = {}
	let tokenTaxesProtocols = {}

	if (dataType === 'dailyEarnings') {
		if (bribesData) {
			const processedBribesData = processRevenueDataForMatching(bribesData.protocols)
			bribesProtocols = matchRevenueToEarnings(processedBribesData, data.protocols)
		}

		if (tokenTaxesData) {
			const processedTokenTaxData = processRevenueDataForMatching(tokenTaxesData.protocols)
			tokenTaxesProtocols = matchRevenueToEarnings(processedTokenTaxData, data.protocols)
		}
	} else {
		bribesProtocols =
			bribesData?.protocols.reduce((acc, p) => {
				acc[p.name] = {
					total24h: p.total24h ?? null,
					total7d: p.total7d ?? null,
					total30d: p.total30d ?? null,
					total1y: p.total1y ?? null,
					totalAllTime: p.totalAllTime ?? null
				}

				const protocolExists = allProtocols.find((ap) => ap.name === p.name)
				if (!protocolExists) {
					allProtocols.push({
						...p,
						total24h: null,
						total7d: null,
						total30d: null,
						total1y: null,
						totalAllTime: null
					})
				}

				return acc
			}, {}) ?? {}

		tokenTaxesProtocols =
			tokenTaxesData?.protocols.reduce((acc, p) => {
				acc[p.name] = {
					total24h: p.total24h ?? null,
					total7d: p.total7d ?? null,
					total30d: p.total30d ?? null,
					total1y: p.total1y ?? null,
					totalAllTime: p.totalAllTime ?? null
				}

				const protocolExists = allProtocols.find((ap) => ap.name === p.name)
				if (!protocolExists) {
					allProtocols.push({
						...p,
						total24h: null,
						total7d: null,
						total30d: null,
						total1y: null,
						totalAllTime: null
					})
				}

				return acc
			}, {}) ?? {}
	}

	const protocols = {}
	const parentProtocols = {}
	const categories = new Set<string>()

	for (const protocol of allProtocols) {
		const methodology =
			adapterType === 'fees'
				? dataType === 'dailyRevenue'
					? (protocol.methodology?.['Revenue'] ??
						protocol.methodology?.['BribeRevenue'] ??
						protocol.methodology?.['TokenTaxes'])
					: dataType === 'dailyHoldersRevenue'
						? (protocol.methodology?.['HoldersRevenue'] ??
							protocol.methodology?.['BribeRevenue'] ??
							protocol.methodology?.['TokenTaxes'])
						: (protocol.methodology?.['Fees'] ??
							protocol.methodology?.['BribeRevenue'] ??
							protocol.methodology?.['TokenTaxes'])
				: null

		const pf =
			protocolsMcap[protocol.name] && protocol.total30d
				? getAnnualizedRatio(protocolsMcap[protocol.name], protocol.total30d)
				: null

		const ps =
			protocolsMcap[protocol.name] && protocol.total30d
				? getAnnualizedRatio(protocolsMcap[protocol.name], protocol.total30d)
				: null

		const summary = {
			name: protocol.displayName,
			slug: protocol.slug,
			logo: protocol.protocolType === 'chain' ? chainIconUrl(protocol.slug) : tokenIconUrl(protocol.slug),
			chains: protocol.chains,
			category: protocol.category ?? null,
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			total1y: protocol.total1y ?? null,
			totalAllTime: protocol.totalAllTime ?? null,
			mcap: protocolsMcap[protocol.name] ?? null,
			...(bribesProtocols[protocol.name] ? { bribes: bribesProtocols[protocol.name] } : {}),
			...(tokenTaxesProtocols[protocol.name] ? { tokenTax: tokenTaxesProtocols[protocol.name] } : {}),
			...(pf ? { pf } : {}),
			...(ps ? { ps } : {}),
			...(methodology ? { methodology: methodology.endsWith('.') ? methodology.slice(0, -1) : methodology } : {}),
			...(protocol.doublecounted ? { doublecounted: protocol.doublecounted } : {}),
			...(ZERO_FEE_PERPS.has(protocol.displayName) ? { zeroFeePerp: true } : {})
		}

		if (protocol.linkedProtocols?.length > 1) {
			parentProtocols[protocol.linkedProtocols[0]] = parentProtocols[protocol.linkedProtocols[0]] || []
			parentProtocols[protocol.linkedProtocols[0]].push(summary)
		} else {
			protocols[protocol.displayName] = summary
		}
		if (protocol.category) {
			categories.add(protocol.category)
		}
	}

	for (const protocol in parentProtocols) {
		if (parentProtocols[protocol].length === 1) {
			protocols[protocol] = {
				...parentProtocols[protocol][0],
				name: protocol,
				slug: slug(protocol)
			}
			continue
		}
		const total24h = parentProtocols[protocol].some((p) => p.total24h != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.total24h ?? 0), 0)
			: null
		const total7d = parentProtocols[protocol].some((p) => p.total7d != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.total7d ?? 0), 0)
			: null
		const total30d = parentProtocols[protocol].some((p) => p.total30d != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.total30d ?? 0), 0)
			: null
		const total1y = parentProtocols[protocol].some((p) => p.total1y != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.total1y ?? 0), 0)
			: null
		const totalAllTime = parentProtocols[protocol].some((p) => p.totalAllTime != null)
			? parentProtocols[protocol].reduce((acc, p) => acc + (p.totalAllTime ?? 0), 0)
			: null
		const doublecounted = parentProtocols[protocol].some((p) => p.doublecounted)
		const zeroFeePerp = parentProtocols[protocol].some((p) => p.zeroFeePerp)
		const bribes = parentProtocols[protocol].some((p) => p.bribes != null)
			? parentProtocols[protocol].reduce(
					(acc, p) => {
						acc.total24h += p.bribes?.total24h ?? 0
						acc.total7d += p.bribes?.total7d ?? 0
						acc.total30d += p.bribes?.total30d ?? 0
						acc.total1y += p.bribes?.total1y ?? 0
						acc.totalAllTime += p.bribes?.totalAllTime ?? 0
						return acc
					},
					{
						total24h: 0,
						total7d: 0,
						total30d: 0,
						total1y: 0,
						totalAllTime: 0
					}
				)
			: null
		const tokenTax = parentProtocols[protocol].some((p) => p.tokenTax != null)
			? parentProtocols[protocol].reduce(
					(acc, p) => {
						acc.total24h += p.tokenTax?.total24h ?? 0
						acc.total7d += p.tokenTax?.total7d ?? 0
						acc.total30d += p.tokenTax?.total30d ?? 0
						acc.total1y += p.tokenTax?.total1y ?? 0
						acc.totalAllTime += p.tokenTax?.totalAllTime ?? 0
						return acc
					},
					{
						total24h: 0,
						total7d: 0,
						total30d: 0,
						total1y: 0,
						totalAllTime: 0
					}
				)
			: null

		const methodology: Array<string> = Array.from(
			new Set(parentProtocols[protocol].filter((p) => p.methodology).map((p) => p.methodology))
		)

		const pf = protocolsMcap[protocol] && total30d ? getAnnualizedRatio(protocolsMcap[protocol], total30d) : null
		const ps = protocolsMcap[protocol] && total30d ? getAnnualizedRatio(protocolsMcap[protocol], total30d) : null

		protocols[protocol] = {
			name: protocol,
			slug: slug(protocol),
			logo: tokenIconUrl(protocol),
			category: parentProtocols[protocol].sort((a, b) => b.total24h - a.total24h)[0].category ?? null,
			chains: Array.from(new Set(parentProtocols[protocol].map((p) => p.chains ?? []).flat())),
			total24h,
			total7d,
			total30d,
			total1y,
			totalAllTime,
			mcap: protocolsMcap[protocol] ?? null,
			childProtocols: parentProtocols[protocol],
			...(bribes ? { bribes } : {}),
			...(tokenTax ? { tokenTax } : {}),
			...(pf ? { pf } : {}),
			...(ps ? { ps } : {}),
			...(methodology.length > 0
				? {
						methodology:
							methodology.length > 1
								? methodology
										.map((m) => {
											const children = parentProtocols[protocol].filter((p) => p.methodology === m)
											return `${children.map((c) => (c.name.startsWith(protocol) ? c.name.replace(protocol, '').trim() : c.name)).join(', ')}: ${m}`
										})
										.join('. ')
								: methodology[0]
					}
				: {}),
			...(doublecounted ? { doublecounted } : {}),
			...(zeroFeePerp ? { zeroFeePerp } : {})
		}
	}

	let finalProtocols = []
	if (route === 'pf') {
		for (const protocol in protocols) {
			if (protocols[protocol].pf != null) {
				finalProtocols.push(protocols[protocol])
			}
		}
	} else if (route === 'ps') {
		for (const protocol in protocols) {
			if (protocols[protocol].ps != null) {
				finalProtocols.push(protocols[protocol])
			}
		}
	} else {
		for (const protocol in protocols) {
			finalProtocols.push(protocols[protocol])
		}
	}

	if (route === 'pf') {
		finalProtocols = finalProtocols.sort(
			(a: IAdapterByChainPageData['protocols'][0], b: IAdapterByChainPageData['protocols'][0]) =>
				(b.pf ?? 0) - (a.pf ?? 0)
		)
	} else if (route === 'ps') {
		finalProtocols = finalProtocols.sort(
			(a: IAdapterByChainPageData['protocols'][0], b: IAdapterByChainPageData['protocols'][0]) =>
				(b.ps ?? 0) - (a.ps ?? 0)
		)
	} else {
		finalProtocols = finalProtocols.sort(
			(a: IAdapterByChainPageData['protocols'][0], b: IAdapterByChainPageData['protocols'][0]) =>
				(b.total24h ?? 0) - (a.total24h ?? 0)
		)
	}

	return {
		chain,
		chains: [
			{ label: 'All', to: `/${route}` },
			...data.allChains.map((chain) => ({ label: chain, to: `/${route}/chain/${slug(chain)}` }))
		],
		protocols: finalProtocols,
		categories: adapterType === 'fees' ? Array.from(categories).sort() : [],
		adapterType,
		chartData: adapterType === 'fees' ? null : data.totalDataChart.map(([date, value]) => [date * 1e3, value]),
		dataType: dataType ?? null,
		total24h: data.total24h ?? null,
		total7d: data.total7d ?? null,
		total30d: data.total30d ?? null,
		change_1d: data.change_1d ?? null,
		change_7d: data.change_7d ?? null,
		change_1m: data.change_1m ?? null,
		change_7dover7d: data.change_7dover7d ?? null
	}
}

export const getChainsByFeesAdapterPageData = async ({
	adapterType,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
}): Promise<IChainsByAdapterPageData> => {
	try {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const allChains: Array<string> = []

		for (const chain in metadataCache.chainMetadata) {
			const chainMetadata = metadataCache.chainMetadata[chain]
			const sType = adapterType === 'fees' ? (dataType === 'dailyRevenue' ? 'chainRevenue' : 'chainFees') : dataType
			if (sType && chainMetadata[sType]) {
				allChains.push(chainMetadata.name)
			}
		}

		const chainsData = await getAdapterChainOverview({
			adapterType,
			dataType,
			chain: 'All',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}).then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChains.includes(p.name)))

		const bribesData =
			adapterType === 'fees'
				? await getAdapterChainOverview({
						adapterType,
						dataType: 'dailyBribesRevenue',
						chain: 'All',
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
					}).then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChains.includes(p.name)))
				: []

		const tokensTaxesData =
			adapterType === 'fees'
				? await getAdapterChainOverview({
						adapterType,
						dataType: 'dailyTokenTaxes',
						chain: 'All',
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
					}).then((res) => res.protocols.filter((p) => p.protocolType === 'chain' && allChains.includes(p.name)))
				: []

		const bribesByChain = {}
		const tokenTaxesByChain = {}

		for (const chain of bribesData) {
			bribesByChain[chain.name] = {
				total24h: chain.total24h ?? null,
				total30d: chain.total30d ?? null
			}
		}

		for (const chain of tokensTaxesData) {
			tokenTaxesByChain[chain.name] = {
				total24h: chain.total24h ?? null,
				total30d: chain.total30d ?? null
			}
		}

		const chains = chainsData
			.map((c) => {
				return {
					name: c.name,
					logo: chainIconUrl(c.name),
					total24h: c.total24h ?? null,
					total30d: c.total30d ?? null,
					...(bribesByChain[c.name] ? { bribes: bribesByChain[c.name] } : {}),
					...(tokenTaxesByChain[c.name] ? { tokenTax: tokenTaxesByChain[c.name] } : {})
				}
			})
			.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))

		return {
			adapterType,
			dataType: dataType ?? null,
			chartData: null,
			chains,
			allChains: chains.map((c) => c.name)
		}
	} catch (error) {
		postRuntimeLogs(error)
		throw error
	}
}

export const getChainsByAdapterPageData = async ({
	adapterType,
	dataType,
	route
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
	route: string
}): Promise<IChainsByAdapterPageData> => {
	try {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const allChains = []

		for (const chain in metadataCache.chainMetadata) {
			const chainMetadata = metadataCache.chainMetadata[chain]
			const sType =
				adapterType === 'fees' && dataType === 'dailyRevenue'
					? 'chainRevenue'
					: ADAPTER_TYPES_TO_METADATA_TYPE[adapterType]
			if (sType && chainMetadata[sType]) {
				allChains.push(chainMetadata.name)
			}
		}

		const chainsData = (
			await Promise.allSettled(
				allChains.map(async (chain) =>
					getAdapterChainOverview({
						adapterType,
						dataType,
						chain,
						excludeTotalDataChart: false,
						excludeTotalDataChartBreakdown: true
					})
				)
			)
		)
			.map((e) => (e.status === 'fulfilled' ? e.value : null))
			.filter((e) => e != null)

		// TODO handle bribes and token taxes
		const bribesByChain = {}
		const tokenTaxesByChain = {}

		const chartData = {}

		for (const chain of chainsData) {
			for (const [date, value] of chain.totalDataChart) {
				chartData[date] = chartData[date] || {}
				chartData[date][chain.chain] = value
			}
		}

		const chains = chainsData
			.map((c) => {
				return {
					name: c.chain,
					logo: chainIconUrl(c.chain),
					total24h: c.total24h ?? null,
					total30d: c.total30d ?? null,
					...(bribesByChain[c.chain] ? { bribes: bribesByChain[c.chain] } : {}),
					...(tokenTaxesByChain[c.chain] ? { tokenTax: tokenTaxesByChain[c.chain] } : {})
				}
			})
			.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))

		return {
			adapterType,
			dataType: dataType ?? null,
			chartData,
			chains,
			allChains: chains.map((c) => c.name)
		}
	} catch (error) {
		postRuntimeLogs(error)
		throw error
	}
}

export const getChainsByREVPageData = async (): Promise<IChainsByREVPageData> => {
	try {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)

		const allChains = []
		for (const chain in metadataCache.chainMetadata) {
			if (metadataCache.chainMetadata[chain]['chainFees']) {
				allChains.push(chain)
			}
		}

		const protocolsByChainsData = await Promise.allSettled(
			allChains.map(async (chain) =>
				getAdapterChainOverview({
					adapterType: 'fees',
					chain,
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
				})
			)
		)

		const chainFeesData = await getAdapterChainOverview({
			adapterType: 'fees',
			chain: 'All',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		})

		const chains = allChains.map((chain, index) => {
			const chainFees = chainFeesData.protocols.find((p) => p.slug === chain)
			const protocols = protocolsByChainsData[index].status === 'fulfilled' ? protocolsByChainsData[index].value : null
			return {
				name: metadataCache.chainMetadata[chain].name,
				slug: chain,
				logo: chainIconUrl(chain),
				total24h:
					(chainFees?.total24h ?? 0) +
					(protocols?.protocols ?? []).reduce((acc, curr) => {
						return REV_PROTOCOLS[chain]?.includes(curr.slug) ? acc + (curr.total24h ?? 0) : acc
					}, 0),
				total30d: chainFees?.total30d ?? null
			}
		})

		return { chains: chains.sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0)) }
	} catch (error) {
		postRuntimeLogs(error)
		throw error
	}
}

export async function getDimensionAdapterOverviewOfAllChains({
	adapterType,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType: `${ADAPTER_DATA_TYPES}`
}) {
	try {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)

		const chains: Record<string, { '24h'?: number; '7d'?: number; '30d'?: number }> = {}
		for (const chain in metadataCache.chainMetadata) {
			const chainMetadata = metadataCache.chainMetadata[chain]
			const adapterMetadata = chainMetadata?.[ADAPTER_TYPES_TO_METADATA_TYPE[adapterType]]
			if (!adapterMetadata) continue
			const dataKey = ADAPTER_DATA_TYPE_KEYS[dataType] ?? null
			const value = chainMetadata.dimAgg?.[adapterType]?.[dataKey]
			if (!value) continue
			chains[chainMetadata.name] = value
		}

		return chains
	} catch (error) {
		postRuntimeLogs(error)
		throw error
	}
}
