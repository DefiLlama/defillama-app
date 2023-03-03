import type { LiteProtocol, IParentProtocol } from '~/api/types'
import { PROTOCOLS_API, ADAPTORS_SUMMARY_BASE_API } from '~/constants'
import { capitalizeFirstLetter, chainIconUrl } from '~/utils'
import { getAPIUrl } from './client'
import { IGetOverviewResponseBody, IJSON, ProtocolAdaptorSummary, ProtocolAdaptorSummaryResponse } from './types'
import { formatChain, getCexVolume, handleFetchResponse } from './utils'

/* export const getDex = async (dexName: string): Promise<IDexResponse> =>
	await fetch(`${DEX_BASE_API}/${dexName}`).then((r) => r.json())

export const getDexs = (): Promise<IGetDexsResponseBody> => fetch(`${DEXS_API}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`).then((r) => r.json()) */

// - used in /[dex]
/* export async function getDexPageData(dex: string) {
	const dexResponse = await fetch(`${DEX_BASE_API}/${dex}`).then((r) => r.json())

	return {
		props: dexResponse
	}
} */
export const getOverviewItem = (
	type: string,
	protocolName: string,
	dataType?: string
): Promise<ProtocolAdaptorSummaryResponse> =>
	fetch(`${ADAPTORS_SUMMARY_BASE_API}/${type}/${protocolName}${dataType ? `?dataType=${dataType}` : ''}`).then(
		handleFetchResponse
	)
export const getOverview = (
	type: string,
	chain?: string,
	dataType?: string,
	includeTotalDataChart?: boolean,
	fullChart?: boolean
): Promise<IGetOverviewResponseBody> =>
	fetch(getAPIUrl(type, chain, !includeTotalDataChart, true, dataType, fullChart)).then(handleFetchResponse)

export interface ProtocolAdaptorSummaryProps extends Omit<ProtocolAdaptorSummaryResponse, 'totalDataChart'> {
	type: string
	totalDataChart: [IJoin2ReturnType, string[]]
	allAddresses?: Array<string>
}

export const generateGetOverviewItemPageDate = async (
	item: ProtocolAdaptorSummaryResponse,
	type: string,
	protocolName: string
): Promise<ProtocolAdaptorSummaryProps> => {
	let label: string
	if (type === 'volumes') {
		label = 'Volume'
	} else if (type === 'options') {
		label = 'Notionial volume'
	} else {
		label = capitalizeFirstLetter(type)
	}
	const allCharts: IChartsList = []
	if (item.totalDataChart) allCharts.push([label, item.totalDataChart])
	let secondType: ProtocolAdaptorSummaryResponse
	let secondLabel: string
	if (type === 'fees') {
		secondType = await getOverviewItem(type, protocolName, 'dailyRevenue')
		secondLabel = 'Revenue'
	} else if (type === 'options') {
		secondType = await getOverviewItem(type, protocolName, 'dailyPremiumVolume')
		secondLabel = 'Premium volume'
	}
	if (secondLabel && secondType?.totalDataChart) allCharts.push([secondLabel, secondType.totalDataChart])

	return {
		...item,
		dailyRevenue: secondType?.total24h ?? null,
		type,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)]
	}
}

export const getOverviewItemPageData = async (
	type: string,
	protocolName: string,
	dataType?: string
): Promise<ProtocolAdaptorSummaryProps> => {
	const item = await getOverviewItem(type, protocolName, dataType)
	return generateGetOverviewItemPageDate(item, type, protocolName)
}

function getMCap(protocolsData: { protocols: LiteProtocol[] }) {
	const protocolsRaw = protocolsData?.protocols
	return (
		protocolsRaw?.reduce((acc, pd) => {
			acc[pd.name] = pd.mcap
			return acc
		}, {}) ?? {}
	)
}

function getTVLData(protocolsData: { protocols: LiteProtocol[] }, chain?: string) {
	const protocolsRaw = chain
		? protocolsData?.protocols.map((p) => ({
			...p,
			tvlPrevDay: p?.chainTvls?.[formatChain(chain)]?.tvlPrevDay ?? null
		}))
		: protocolsData?.protocols
	return (
		protocolsRaw?.reduce((acc, pd) => {
			acc[pd.name] = pd.tvlPrevDay
			return acc
		}, {}) ?? {}
	)
}
const getMapingCoinGeckoId = (name: string): string => {
	const _name = {
		Cronos: 'crypto-com-chain',
		Doge: 'dogecoin',
		Polygon: 'matic-network',
		Avalanche: 'avalanche-2',
		BSC: 'binancecoin'
	}[name]
	return _name ?? name
}

// Get TVL data
const sumTVLProtocols = (protocolName: string, versions: string[], tvlData: IJSON<number>) => {
	return versions.reduce((acc, version) => {
		return (acc += tvlData[`${protocolName} ${version.toUpperCase()}`])
	}, 0)
}

// - used in /[type] and /[type]/chains/[chain]
export const getChainPageData = async (type: string, chain?: string): Promise<IOverviewProps> => {
	const feesOrRevenueApi =
		type === 'options'
			? getAPIUrl(type, chain, false, true, 'dailyPremiumVolume')
			: getAPIUrl(type, chain, true, true, 'dailyRevenue')

	const [request, protocolsData, feesOrRevenue, cexVolume]: [
		IGetOverviewResponseBody,
		{ protocols: LiteProtocol[], parentProtocols: IParentProtocol[] },
		IGetOverviewResponseBody,
		number
	] = await Promise.all([
		fetch(getAPIUrl(type, chain, type === 'fees', true)).then(handleFetchResponse),
		fetch(PROTOCOLS_API).then(handleFetchResponse),
		fetch(feesOrRevenueApi).then(handleFetchResponse),
		type === 'dexs' ? getCexVolume() : Promise.resolve(0)
	])

	const {
		protocols = [],
		total24h,
		total7d,
		change_1d,
		change_7d,
		change_1m,
		change_7dover7d,
		totalDataChart,
		totalDataChartBreakdown,
		allChains
	} = request
	const chains = protocols.filter((e) => e.protocolType === 'chain').map((e) => e.name)
	const chainMcaps = await fetch(
		`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(chains)
			.map((c: string) => getMapingCoinGeckoId(c))
			.map((v: string) => v.toLocaleUpperCase())
			.join(',')}&vs_currencies=usd&include_market_cap=true`
	).then((res) => res.json())
	const chainMcap =
		chains?.reduce((acc, pd) => {
			acc[pd] = chainMcaps[getMapingCoinGeckoId(pd).toLowerCase()]?.usd_market_cap || null
			return acc
		}, {}) ?? {}

	const tvlData: IJSON<number> = getTVLData(protocolsData, chain)
	const mcapData = { ...getMCap(protocolsData), ...chainMcap }
	const label: string = type === 'options' ? 'Notionial volume' : capitalizeFirstLetter(type)

	const allCharts: IChartsList = []

	if (totalDataChart) {
		allCharts.push([label, totalDataChart])
	}

	if (type === 'options' && feesOrRevenue?.totalDataChart) {
		allCharts.push(['Premium volume', feesOrRevenue.totalDataChart])
	}

	const revenueProtocols =
		type === 'fees'
			? feesOrRevenue?.protocols?.reduce(
				(acc, protocol) => ({ ...acc, [protocol.name]: protocol }),
				{} as IJSON<ProtocolAdaptorSummary>
			) ?? {}
			: {}

	const { parentProtocols } = protocolsData
	const parentProtocolsMap = parentProtocols.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})

	const protocolsWithSubrows = protocols.reduce((acc, protocol) => {
		// Assign mainrow and sub-row if has any
		let mainRow: undefined | IOverviewProps['protocols'][number] = undefined
		let subRow: undefined | IOverviewProps['protocols'][number]['subRows'][number] = null
		if (parentProtocolsMap[protocol.parentProtocol]) {
			mainRow = parentProtocolsMap[protocol.parentProtocol]
			subRow = {
				...protocol,
				tvl: tvlData[protocol.displayName] ?? null,
				volumetvl: tvlData[protocol.displayName] ? protocol.total24h / tvlData[protocol.displayName] : null,
				dominance: (100 * protocol.total24h) / total24h,
				revenue24h: revenueProtocols?.[protocol.name]?.total24h ?? null,
				revenue7d: revenueProtocols?.[protocol.name]?.total7d ?? null,
				revenue30d: revenueProtocols?.[protocol.name]?.total30d ?? null,
				mcap: mcapData[protocol.name] || null
			}
			// If already included parent protocol we add the new child
			if (acc[protocol.parentProtocol])
				acc[protocol.parentProtocol].subRows.push(subRow)
			// If first time processed parent protocol we create the subrows list
			else
				acc[protocol.parentProtocol] = { ...acc[protocol.parentProtocol], subRows: [subRow] }
		}
		else mainRow = protocol

		// Main row, either parent or single protocol
		const protocolTVL =
			tvlData[protocol.name] ?? sumTVLProtocols(protocol.name, Object.keys(protocol.protocolsStats ?? {}), tvlData)
		mainRow = {
			...mainRow,
			...acc[protocol.parentProtocol],
			displayName: mainRow.displayName ?? mainRow.name,
			revenue24h: revenueProtocols?.[protocol.name]?.total24h ?? null,
			revenue7d: revenueProtocols?.[protocol.name]?.total7d ?? null,
			revenue30d: revenueProtocols?.[protocol.name]?.total30d ?? null,
			tvl: protocolTVL ?? null,
			dominance: (100 * protocol.total24h) / total24h,
			chains: protocol.chains,
			module: protocol.module,
			dailyUserFees: protocol.dailyUserFees ?? null,
			mcap: mcapData[protocol.name] || null
		}
		// Stats for parent protocol
		if (acc[protocol.parentProtocol]) {
			mainRow.total24h = acc[protocol.parentProtocol].subRows.reduce((acc, curr) => acc += curr.total24h, 0)
			mainRow.total7d = acc[protocol.parentProtocol].subRows.reduce((acc, curr) => acc += curr.total7d, 0)
			mainRow.total30d = acc[protocol.parentProtocol].subRows.reduce((acc, curr) => acc += curr.total30d, 0)
			mainRow.totalAllTime = acc[protocol.parentProtocol].subRows.reduce((acc, curr) => acc += curr.totalAllTime, 0)
			mainRow.tvl = acc[protocol.parentProtocol].subRows.reduce((acc, curr) => acc += curr.tvl, 0)
			mainRow.volumetvl = acc[protocol.parentProtocol].subRows.reduce((acc, curr) => acc += curr.tvl, 0)
		}
		// Computed stats
		mainRow.volumetvl = mainRow.total24h / mainRow.tvl

		// Return acc
		acc[protocol.parentProtocol ?? protocol.module] = mainRow
		return acc
	}, {} as IJSON<IOverviewProps['protocols'][number]>)

	/* 	if (revenue?.totalDataChart)
			allCharts.push(["Revenue", revenue.totalDataChart]) */

	return {
		protocols: Object.values(protocolsWithSubrows),
		total24h,
		total7d,
		change_1d,
		change_7d,
		change_1m,
		change_7dover7d,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)],
		chain: chain ? formatChain(chain) : null,
		tvlData,
		totalDataChartBreakdown,
		allChains,
		dexsDominance: cexVolume ? +((total24h / (cexVolume + total24h)) * 100).toFixed(2) : null,
		type
	}
}
export interface IOverviewProps {
	protocols: Array<
		IGetOverviewResponseBody['protocols'][number] & {
			subRows?: IGetOverviewResponseBody['protocols']
			volumetvl?: number
			tvl?: number
			dominance?: number
		}
	>
	total24h?: IGetOverviewResponseBody['total24h']
	total7d?: IGetOverviewResponseBody['total7d']
	change_1d?: IGetOverviewResponseBody['change_1d']
	change_7d?: IGetOverviewResponseBody['change_7d']
	change_1m?: IGetOverviewResponseBody['change_1m']
	change_7dover7d?: IGetOverviewResponseBody['change_7dover7d']
	totalDataChart: [IJoin2ReturnType, string[]]
	chain: string
	tvlData?: IJSON<number>
	totalDataChartBreakdown?: IGetOverviewResponseBody['totalDataChartBreakdown']
	allChains?: IGetOverviewResponseBody['allChains']
	totalAllTime?: ProtocolAdaptorSummaryResponse['totalAllTime']
	type: string
	dexsDominance?: number
	categories?: Array<string>
}

// - used in /[type]/chains
export const getChainsPageData = async (type: string): Promise<IOverviewProps> => {
	const { allChains, total24h: allChainsTotal24h } = await getOverview(type)

	const [protocolsData, ...dataByChain] = await Promise.all([
		fetch(PROTOCOLS_API).then(handleFetchResponse),
		...allChains.map((chain) => getOverview(type, chain, undefined, true, true).then((res) => ({ ...res, chain })))
	])

	let protocols = dataByChain
		.map(
			({
				total24h,
				change_1d,
				change_7d,
				chain,
				change_1m,
				protocols,
				change_7dover7d,
				total7d,
				total30d,
				dailyRevenue,
				dailyUserFees,
				dailyHoldersRevenue,
				dailyCreatorRevenue,
				dailySupplySideRevenue,
				dailyProtocolRevenue,
				dailyPremiumVolume
			}) => {
				if (!protocols) return undefined
				const tvlData = getTVLData(protocolsData, chain)
				return {
					name: chain,
					displayName: chain,
					disabled: null,
					logo: chainIconUrl(chain),
					total24h,
					tvl: protocols.reduce((acc, curr) => {
						// TODO: This should be mapped using defillamaId to get accurate tvl!
						const tvl =
							tvlData[curr.name] ?? sumTVLProtocols(curr.name, Object.keys(curr.protocolsStats ?? {}), tvlData)
						acc += !Number.isNaN(tvl) ? tvl : 0
						return acc
					}, 0),
					change_7dover7d,
					total7d,
					total30d,
					change_1d,
					change_7d,
					change_1m,
					dominance: (100 * total24h) / allChainsTotal24h,
					chains: [chain],
					totalAllTime: protocols.reduce((acc, curr) => (acc += curr.totalAllTime), 0),
					protocolsStats: null,
					breakdown24h: null,
					module: chain,
					dailyRevenue: dailyRevenue ?? null,
					dailyUserFees: dailyUserFees ?? null,
					dailyHoldersRevenue: dailyHoldersRevenue ?? null,
					dailyCreatorRevenue: dailyCreatorRevenue ?? null,
					dailySupplySideRevenue: dailySupplySideRevenue ?? null,
					dailyProtocolRevenue: dailyProtocolRevenue ?? null,
					dailyPremiumVolume: dailyPremiumVolume ?? null,
					mcap: null
				}
			}
		)
		.filter(notUndefined)

	const allCharts = dataByChain.map((chainData) => [chainData.chain, chainData.totalDataChart]) as IChartsList
	let aggregatedChart = joinCharts2(...allCharts)
	const sum = (obj: IJSON<string | number>) => {
		return Object.values(obj).reduce<number>((acc, curr) => (typeof curr === 'number' ? (acc += curr) : acc), 0)
	}
	aggregatedChart = aggregatedChart.slice(
		aggregatedChart.findIndex((it) => sum(it) !== 0),
		aggregatedChart.length - [...aggregatedChart].reverse().findIndex((it) => sum(it) !== 0)
	)
	return {
		type,
		protocols,
		chain: 'all',
		totalDataChart: [aggregatedChart, allCharts.map(([label]) => label)]
	}
}

type IChartsList = Array<[string, IGetOverviewResponseBody['totalDataChart']]>
export type IJoin2ReturnType = Array<IJSON<number | string> & { date: string }>
export const joinCharts2 = (...lists: Array<[string, Array<[number, number]>]>): IJoin2ReturnType =>
	Object.values(
		lists.reduce((acc, [name, list]) => {
			list?.forEach(([timestamp, value]) => {
				if (acc[timestamp])
					acc[String(timestamp)] = {
						...acc[String(timestamp)],
						[name]: value
					}
				else
					acc[String(timestamp)] = {
						[name]: value,
						date: String(timestamp)
					}
			})
			return acc
		}, {} as IJSON<IJoin2ReturnType[number]>)
	).map<IJoin2ReturnType[number]>((bar) => {
		const date = bar.date
		delete bar.date
		const ordredItems = Object.entries(bar)
		return {
			date,
			...ordredItems.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as IJoin2ReturnType[number])
		}
	})

export function notUndefined<T>(x: T | undefined): x is T {
	return x !== undefined
}
