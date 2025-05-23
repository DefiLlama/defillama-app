import { BASE_API, DIMENISIONS_OVERVIEW_API, DIMENISIONS_SUMMARY_BASE_API, MCAPS_API, PROTOCOLS_API } from '~/constants'
import { fetchWithErrorLogging, postRuntimeLogs } from '~/utils/async'
import { chainIconUrl, slug, tokenIconUrl } from '~/utils'
import { ADAPTOR_TYPES } from './constants'
import metadataCache from '~/utils/metadata'
import { IAdapterChainPageData } from './types'

const fetch = fetchWithErrorLogging

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
	total24h: number | null
	total48hto24h: number | null
	total7d: number | null
	totalAllTime: number | null
	totalDataChartBreakdown: Array<[number, Record<string, Record<string, number>>]>
	totalDataChart: Array<[number, number]>
	linkedProtocols?: string[]
}

export async function getAdapterChainOverview({
	type,
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown,
	dataType
}: {
	type: `${ADAPTOR_TYPES}`
	chain: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
	dataType?: string
}) {
	let url = `${DIMENISIONS_OVERVIEW_API}/${type === 'derivatives-aggregator' ? 'aggregator-derivatives' : type}${
		chain && chain !== 'All' ? `/${slug(chain)}` : ''
	}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`

	if (dataType) {
		url += `&dataType=${dataType}`
	}

	const data = await fetchWithErrorLogging(url).then(handleFetchResponse)

	return data as IAdapterOverview
}

export async function getAdapterProtocolSummary({
	type,
	protocol,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown,
	dataType
}: {
	type: `${ADAPTOR_TYPES}`
	protocol: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
	dataType?: string
}) {
	let url = `${DIMENISIONS_SUMMARY_BASE_API}/${type === 'derivatives-aggregator' ? 'aggregator-derivatives' : type}${
		protocol && protocol !== 'All' ? `/${slug(protocol)}` : ''
	}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`

	if (dataType) {
		url += `&dataType=${dataType}`
	}

	const data = await fetchWithErrorLogging(url).then(handleFetchResponse)

	return data as IAdapterSummary
}

export async function getCexVolume() {
	const [cexs, btcPriceRes] = await Promise.all([
		fetch(
			`${BASE_API}cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/exchanges?per_page=250'
			)}`
		).then(handleFetchResponse),
		fetch(
			`${BASE_API}cachedExternalResponse?url=${encodeURIComponent(
				'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
			)}`
		).then(handleFetchResponse)
	])
	const btcPrice = btcPriceRes?.bitcoin?.usd
	if (!btcPrice || !cexs || typeof cexs.filter !== 'function') return undefined
	// cexs might not be a list TypeError: cexs.filter is not a function
	const volume = cexs.filter((c) => c.trust_score >= 9).reduce((sum, c) => sum + c.trade_volume_24h_btc, 0) * btcPrice
	return volume
}

export const getAdapterChainPageData = async ({
	adaptorType,
	chain,
	dataType,
	route
}: {
	adaptorType: `${ADAPTOR_TYPES}`
	chain: string
	dataType?: string
	route: string
}) => {
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
			type: adaptorType,
			chain,
			dataType,
			excludeTotalDataChart: false,
			excludeTotalDataChartBreakdown: true
		}),
		fetch(PROTOCOLS_API).then(handleFetchResponse),
		adaptorType === 'fees'
			? getAdapterChainOverview({
					type: adaptorType,
					chain,
					dataType: 'dailyBribesRevenue',
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null),
		adaptorType === 'fees'
			? getAdapterChainOverview({
					type: adaptorType,
					chain,
					dataType: 'dailyTokenTaxes',
					excludeTotalDataChart: false,
					excludeTotalDataChartBreakdown: true
			  })
			: Promise.resolve(null)
	])

	const chains = data.protocols
		.filter((e) => e.protocolType === 'chain')
		.map((e) => [e.name, metadataCache.chainMetadata[slug(e.name)]?.gecko_id ?? null])
		.filter((e) => (e[1] ? true : false))

	const chainMcaps = await fetch(MCAPS_API, {
		method: 'POST',
		body: JSON.stringify({
			coins: chains.map(([_, geckoId]) => `coingecko:${geckoId}`)
		})
	})
		.then((r) => r.json())
		.catch((err) => {
			console.log('Failed to fetch mcaps by chain')
			console.log(err)
			return {}
		})

	const chainsMcap =
		chains?.reduce((acc, [chain, geckoId]) => {
			if (geckoId) {
				acc[chain] = chainMcaps[`coingecko:${geckoId}`]?.mcap ?? null
			}
			return acc
		}, {}) ?? {}

	const protocolsMcap = {}
	for (const protocol of protocolsData.protocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}
	for (const protocol of protocolsData.parentProtocols) {
		protocolsMcap[protocol.name] = protocol.mcap ?? null
	}
	const mcapData = { ...protocolsMcap, chainsMcap }

	const bribesProtocols =
		bribesData?.protocols.reduce((acc, p) => {
			if (p.total24h != null) {
				acc[p.name] = {
					total24h: p.total24h ?? null,
					total7d: p.total7d ?? null,
					total30d: p.total30d ?? null,
					total1y: p.total1y ?? null,
					totalAllTime: p.totalAllTime ?? null
				}
			}
			return acc
		}, {}) ?? {}

	const tokenTaxesProtocols =
		tokenTaxesData?.protocols.reduce((acc, p) => {
			if (p.total24h != null) {
				acc[p.name] = {
					total24h: p.total24h ?? null,
					total7d: p.total7d ?? null,
					total30d: p.total30d ?? null,
					total1y: p.total1y ?? null,
					totalAllTime: p.totalAllTime ?? null
				}
			}
			return acc
		}, {}) ?? {}

	const protocols = {}
	const parentProtocols = {}
	const categories = new Set()
	for (const protocol of data.protocols) {
		if (protocol.total24h == null) continue

		if (protocol.linkedProtocols?.length > 1) {
			parentProtocols[protocol.linkedProtocols[0]] = parentProtocols[protocol.linkedProtocols[0]] || []
			parentProtocols[protocol.linkedProtocols[0]].push({
				name: protocol.name,
				slug: protocol.slug,
				logo: protocol.protocolType === 'chain' ? chainIconUrl(protocol.slug) : tokenIconUrl(protocol.slug),
				chains: protocol.chains,
				category: protocol.category ?? null,
				total24h: protocol.total24h ?? null,
				total7d: protocol.total7d ?? null,
				total30d: protocol.total30d ?? null,
				total1y: protocol.total1y ?? null,
				totalAllTime: protocol.totalAllTime ?? null,
				mcap: mcapData[protocol.name] ?? null,
				...(bribesProtocols[protocol.name] ? { bribes: bribesProtocols[protocol.name] } : {}),
				...(tokenTaxesProtocols[protocol.name] ? { tokenTax: tokenTaxesProtocols[protocol.name] } : {})
			})
		} else {
			protocols[protocol.name] = {
				name: protocol.name,
				slug: protocol.slug,
				logo: protocol.protocolType === 'chain' ? chainIconUrl(protocol.slug) : tokenIconUrl(protocol.slug),
				chains: protocol.chains,
				category: protocol.category ?? null,
				total24h: protocol.total24h ?? null,
				total7d: protocol.total7d ?? null,
				total30d: protocol.total30d ?? null,
				total1y: protocol.total1y ?? null,
				totalAllTime: protocol.totalAllTime ?? null,
				mcap: mcapData[protocol.name] ?? null,
				...(bribesProtocols[protocol.name] ? { bribes: bribesProtocols[protocol.name] } : {}),
				...(tokenTaxesProtocols[protocol.name] ? { tokenTax: tokenTaxesProtocols[protocol.name] } : {})
			}
		}
		if (protocol.category) {
			categories.add(protocol.category)
		}
	}

	for (const protocol in parentProtocols) {
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

		const categories = Array.from(new Set(parentProtocols[protocol].filter((p) => p.category).map((p) => p.category)))

		protocols[protocol] = {
			name: protocol,
			slug: slug(protocol),
			logo: tokenIconUrl(protocol),
			category: categories.length > 1 ? null : categories[0] ?? null,
			chains: Array.from(new Set(parentProtocols[protocol].map((p) => p.chains ?? []).flat())),
			total24h,
			total7d,
			total30d,
			total1y,
			totalAllTime,
			mcap: mcapData[protocol] ?? null,
			childProtocols: parentProtocols[protocol],
			...(bribes ? { bribes } : {}),
			...(tokenTax ? { tokenTax } : {})
		}
	}

	return {
		chain,
		chains: [
			{ label: 'All', to: `/${route}` },
			...data.allChains.map((chain) => ({ label: chain, to: `/${route}/chain/${slug(chain)}` }))
		],
		protocols: Object.values(protocols).sort(
			(a: IAdapterChainPageData['protocols'][0], b: IAdapterChainPageData['protocols'][0]) =>
				(b.total24h ?? 0) - (a.total24h ?? 0)
		),
		categories: adaptorType === 'fees' ? Array.from(categories).sort() : [],
		adaptorType,
		dataType: dataType ?? null
	}
}

async function handleFetchResponse(res: Response) {
	try {
		const response = await res.json()
		return response
	} catch (e) {
		postRuntimeLogs(
			`Failed to parse response from ${res.url}, with status ${res.status} and error message ${e.message}`
		)
		return {}
	}
}
