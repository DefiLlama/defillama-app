import type { LiteProtocol } from '~/api/types'
import { DEXS_API, PROTOCOLS_API, ADAPTORS_BASE_API, ADAPTORS_SUMMARY_BASE_API } from '~/constants'
import { IOverviewContainerProps } from '~/containers/Overview'
import { upperCaseFirst } from '~/containers/Overview/utils'
import { chainIconUrl, getColorFromNumber } from '~/utils'
import { getAPIUrl } from './client'
import { IGetOverviewResponseBody, IJSON, ProtocolAdaptorSummary, ProtocolAdaptorSummaryResponse } from './types'
import { formatChain } from './utils'

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
	fetch(
		`${ADAPTORS_SUMMARY_BASE_API}/${type}/${protocolName}${dataType ? `?dataType=${dataType}` : ''
		}`
	).then((r) => r.json())
export const getOverview = (type: string, chain?: string, dataType?: string, includeTotalDataChart?: boolean, fullChart?: boolean): Promise<IGetOverviewResponseBody> =>
	fetch(getAPIUrl(type, chain, !includeTotalDataChart, true, dataType, fullChart)).then((r) => r.json())

export interface ProtocolAdaptorSummaryProps extends Omit<ProtocolAdaptorSummaryResponse, 'totalDataChart'> {
	type: string
	totalDataChart: [IJoin2ReturnType, string[]]
	revenue24h: number | null
}

export const getOverviewItemPageData = async (
	type: string,
	protocolName: string,
	dataType?: string
): Promise<ProtocolAdaptorSummaryProps> => {
	const item = await getOverviewItem(type, protocolName, dataType)
	let label: string
	if (type === 'volumes') {
		label = "Volume"
	} else if (type === 'options') {
		label = "Notionial volume"
	} else {
		label = upperCaseFirst(type)
	}
	const allCharts: IChartsList = []
	if (item.totalDataChart) allCharts.push([label, item.totalDataChart])
	let secondType: ProtocolAdaptorSummaryResponse
	let secondLabel: string
	if (type === 'fees') {
		secondType = await getOverviewItem(type, protocolName, 'dailyRevenue')
		secondLabel = "Revenue"
	}
	else if (type === 'options') {
		secondType = await getOverviewItem(type, protocolName, 'dailyPremiumVolume')
		secondLabel = "Premium volume"
	}
	if (secondLabel && secondType?.totalDataChart)
		allCharts.push([secondLabel, secondType.totalDataChart])

	return {
		...item,
		revenue24h: secondType?.total24h ?? null,
		type,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)],
	}
}

// - used in /overview/[type] and /overview/[type]/chains/[chain]
export const getChainPageData = async (type: string, chain?: string): Promise<IOverviewProps> => {
	const request = (await fetch(getAPIUrl(type, chain, type === 'fees', true)).then((res) =>
		res.json()
	)) as IGetOverviewResponseBody
	const {
		protocols = [],
		total24h,
		change_1d,
		change_7d,
		change_1m,
		totalDataChart,
		totalDataChartBreakdown,
		allChains
	} = request
	const getProtocolsRaw = (): Promise<{ protocols: LiteProtocol[] }> => fetch(PROTOCOLS_API).then((r) => r.json())
	const protocolsData = await getProtocolsRaw()
	const tvlData = protocolsData.protocols.reduce((acc, pd) => {
		acc[pd.name] = pd.tvlPrevDay
		return acc
	}, {})

	let label: string
	if (type === 'options') {
		label = "Notionial volume"
	} else {
		label = upperCaseFirst(type)
	}
	const allCharts: IChartsList = []
	if (totalDataChart) allCharts.push([label, totalDataChart])

	let secondType: IGetOverviewResponseBody
	let secondLabel: string
	if (type === 'options') {
		secondType = (await fetch(getAPIUrl(type, chain, false, true, "dailyPremiumVolume")).then((res) =>
			res.json()
		)) as IGetOverviewResponseBody
		secondLabel = "Premium volume"
	}
	if (secondLabel && secondType?.totalDataChart)
		allCharts.push([secondLabel, secondType.totalDataChart])

	let revenue: IGetOverviewResponseBody
	if (type === 'fees') revenue = ((await fetch(getAPIUrl(type, chain, true, true, 'dailyRevenue')).then((res) => res.json())) as IGetOverviewResponseBody)
	const revenueProtocols = revenue?.protocols.reduce((acc, protocol) => ({ ...acc, [protocol.name]: protocol }), {} as IJSON<ProtocolAdaptorSummary>)

	// Get TVL data
	const sumTVLProtocols = (protocolName: string, versions: string[], tvlData: IJSON<number>) => {
		return versions.reduce((acc, version) => {
			return acc += tvlData[`${protocolName} ${version.toUpperCase()}`]
		}, 0)
	}
	const protocolsWithSubrows = protocols.map((protocol) => {
		const volumetvl = protocol.total24h / (tvlData[protocol.name] ?? (sumTVLProtocols(protocol.name, Object.keys(protocol.protocolsStats ?? {}), tvlData)))
		return {
			...protocol,
			revenue24h: revenueProtocols?.[protocol.name]?.total24h ?? 0,
			volumetvl,
			dominance: (100 * protocol.total24h) / total24h,
			chains: protocol.chains,
			module: protocol.module,
			subRows: protocol.protocolsStats
				? Object.entries(protocol.protocolsStats)
					.map(([versionName, summary]) => ({
						...protocol,
						displayName: `${protocol.name} ${versionName.toUpperCase()}`,
						...summary,
						totalAllTime: null,
						revenue24h: revenueProtocols?.[protocol.name]?.protocolsStats[versionName]?.total24h ?? 0 as number
					}))
					.sort((first, second) => 0 - (first.total24h > second.total24h ? 1 : -1))
				: null
		}
	})

	/* 	if (revenue?.totalDataChart)
			allCharts.push(["Revenue", revenue.totalDataChart]) */

	return {
		protocols: protocolsWithSubrows,
		total24h,
		change_1d,
		change_7d,
		change_1m,
		totalDataChart: [joinCharts2(...allCharts), allCharts.map(([label]) => label)],
		chain: chain ? formatChain(chain) : null,
		tvlData,
		totalDataChartBreakdown,
		allChains,
		type
	}
}

export interface IOverviewProps {
	protocols: Array<IGetOverviewResponseBody['protocols'][number] & {
		subRows?: IGetOverviewResponseBody['protocols'],
		volumetvl?: number
		dominance?: number
	}>
	total24h?: IGetOverviewResponseBody['total24h']
	change_1d?: IGetOverviewResponseBody['change_1d']
	change_7d?: IGetOverviewResponseBody['change_7d']
	change_1m?: IGetOverviewResponseBody['change_1m']
	totalDataChart: [IJoin2ReturnType, string[]]
	chain: string
	tvlData?: IJSON<number>
	totalDataChartBreakdown?: IGetOverviewResponseBody['totalDataChartBreakdown']
	allChains?: IGetOverviewResponseBody['allChains']
	totalAllTime?: ProtocolAdaptorSummaryResponse['totalAllTime']
	type: string
}

// - used in /[type]/chains
export const getChainsPageData = async (type: string): Promise<IOverviewProps> => {
	const { allChains, total24h: allChainsTotal24h } = await getOverview(type)

	const dataByChain = await Promise.all(allChains.map((chain) => getOverview(type, chain, undefined, true, true).then(res => ({ ...res, chain }))))

	let protocols = dataByChain.map(({ total24h, change_1d, change_7d, chain, change_1m, protocols }) => ({
		name: chain,
		displayName: chain,
		disabled: null,
		logo: chainIconUrl(chain),
		total24h,
		change_1d,
		change_7d,
		change_1m,
		dominance: (100 * total24h) / allChainsTotal24h,
		chains: [chain],
		totalAllTime: protocols.reduce((acc, curr) => acc += curr.totalAllTime, 0),
		protocolsStats: null,
		breakdown24h: null,
		module: chain,
		revenue24h: null,
	}))

	const allCharts = dataByChain.map(chainData => [chainData.chain, chainData.totalDataChart]) as IChartsList
	let aggregatedChart = joinCharts2(...allCharts)
	const sum = (obj: IJSON<string | number>) => {
		return Object.values(obj).reduce<number>((acc, curr) => typeof curr === 'number' ? acc += curr : acc, 0)
	}
	aggregatedChart = aggregatedChart.slice(
		aggregatedChart.findIndex(it => sum(it) !== 0),
		aggregatedChart.length - [...aggregatedChart].reverse().findIndex(it => sum(it) !== 0)
	)
	return {
		type,
		protocols,
		chain: 'all',
		totalDataChart: [aggregatedChart, allCharts.map(([label]) => label)],
	}
}

type IChartsList = Array<[string, IGetOverviewResponseBody['totalDataChart']]>
export type IJoin2ReturnType = Array<IJSON<number | string> & { date: string }>
export const joinCharts2 = (...lists: Array<[string, Array<[number, number]>]>): IJoin2ReturnType =>
	Object.values(
		lists.reduce((acc, [name, list]) => {
			list.forEach(([timestamp, value]) => {
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
	).map<IJoin2ReturnType[number]>(bar => {
		const date = bar.date
		delete bar.date
		const ordredItems = Object.entries(bar as IJSON<number>)
			.sort(([_a, a], [_b, b]) => b - a)
		return {
			date,
			...ordredItems.slice(0, 11).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as IJoin2ReturnType[number]),
			...ordredItems.slice(11).reduce((acc, [key, _value]) => ({ ...acc, [key]: 0 }), {} as IJoin2ReturnType[number]),
			Others: ordredItems.slice(11).reduce((acc, curr) => acc += curr[1], 0)
		}
	})

const getPercent = (value: number, total: number) => {
	const ratio = total > 0 ? value / total : 0

	return Number((ratio * 100).toFixed(2))
}
