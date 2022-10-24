import type { LiteProtocol } from '~/api/types'
import { DEXS_API, PROTOCOLS_API, ADAPTORS_BASE_API, ADAPTORS_SUMMARY_BASE_API } from '~/constants'
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
		`${ADAPTORS_SUMMARY_BASE_API}/${type}/${protocolName}/?excludeTotalDataChartBreakdown=true${dataType ? `&dataType=${dataType}` : ''
		}`
	).then((r) => r.json())
export const getOverview = (type: string, chain?: string, dataType?: string): Promise<IGetOverviewResponseBody> =>
	fetch(
		`${ADAPTORS_BASE_API}/${type}/${chain ?? ''}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true${dataType ? `&dataType=${dataType}` : ''
		}`
	).then((r) => r.json())

export interface ProtocolAdaptorSummaryProps extends Omit<ProtocolAdaptorSummaryResponse, 'totalDataChart'> {
	type: string
	totalDataChart: IJoin2ReturnType
	revenue24h: number | null
}

export const getOverviewItemPageData = async (
	type: string,
	protocolName: string,
	dataType?: string
): Promise<ProtocolAdaptorSummaryProps> => {
	const item = await getOverviewItem(type, protocolName, dataType)

	const label = type === 'volumes' ? upperCaseFirst('volume') : upperCaseFirst(type)
	const allCharts: IChartsList = []
	if (item.totalDataChart) allCharts.push([label, item.totalDataChart])
	let revenue: ProtocolAdaptorSummaryResponse
	if (type === 'fees') revenue = await getOverviewItem(type, protocolName, 'dailyRevenue')
	if (revenue?.totalDataChart) allCharts.push(['Revenue', revenue.totalDataChart])

	return {
		...item,
		revenue24h: revenue?.total24h ?? null,
		type,
		totalDataChart: joinCharts2(...allCharts)
	}
}

// - used in /overview/[type] and /overview/[type]/[chain]
export const getChainPageData = async (type: string, chain?: string) => {
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

	const allCharts: IChartsList = []
	if (totalDataChart) allCharts.push([upperCaseFirst(type), totalDataChart])

	let revenue: IGetOverviewResponseBody
	if (type === 'fees') revenue = ((await fetch(getAPIUrl(type, chain, true, true, 'dailyRevenue')).then((res) => res.json())) as IGetOverviewResponseBody)
	const revenueProtocols = revenue?.protocols.reduce((acc, protocol) => ({ ...acc, [protocol.name]: protocol }), {} as IJSON<ProtocolAdaptorSummary>)
	const protocolsWithSubrows = protocols.map((protocol) => {
		const volumetvl = protocol.total24h / (tvlData[protocol.name] ?? (sumTVLProtocols(protocol.name, Object.keys(protocol.protocolsStats ?? {}), tvlData)))
		return {
			...protocol,
			revenue24h: revenueProtocols?.[protocol.name]?.total24h ?? 0,
			volumetvl,
			dominance: (100 * protocol.total24h) / total24h,
			chains: protocol.chains,
			subRows: protocol.protocolsStats
				? Object.entries(protocol.protocolsStats)
					.map(([versionName, summary]) => ({
						...protocol,
						name: `${protocol.name} ${versionName.toUpperCase()}`,
						displayName: `${protocol.name} ${versionName.toUpperCase()}`,
						...summary,
						totalAllTime: null,
						revenue24h: revenueProtocols?.[protocol.name]?.protocolsStats[versionName]?.total24h ?? 0
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
		totalDataChart: joinCharts(...allCharts),
		chain: chain ? formatChain(chain) : null,
		tvlData,
		totalDataChartBreakdown,
		allChains
	}
}

const sumTVLProtocols = (protocolName: string, versions: string[], tvlData: IJSON<number>) => {
	return versions.reduce((acc, version) => {
		return acc += tvlData[`${protocolName} ${version.toUpperCase()}`]
	}, 0)
}

type IChartsList = Array<[string, IGetOverviewResponseBody['totalDataChart']]>
export type IJoinReturnType = {
	name: string
	data: [Date, number][]
}[]
const joinCharts = (...lists: IChartsList): IJoinReturnType =>
	Object.values(
		lists.reduce((acc, [name, list]) => {
			list.forEach((record) => {
				if (acc[name])
					acc[name] = {
						name: name,
						data: [...acc[name].data, [record[0], record[1]]]
					}
				else
					acc[name] = {
						name,
						data: [[record[0], record[1]]]
					}
			})
			return acc
		}, {})
	)

export type IJoin2ReturnType = Array<IJSON<number> & { date: string }>
const joinCharts2 = (...lists: Array<[string, Array<[number, number]>]>): IJoin2ReturnType =>
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
		}, {})
	)

// - used in /dexs/chains
export const getVolumesByChain = async () => {
	const { allChains } = (await fetch(`${DEXS_API}?excludeTotalDataChartBreakdown=true&excludeTotalDataChart=true`).then(
		(res) => res.json()
	)) as IGetOverviewResponseBody

	const volumesByChain = await Promise.all(allChains.map((chain) => getChainPageData(chain)))

	let tableData = volumesByChain.map(({ total24h, change_1d, change_7d, chain, change_1m }) => ({
		name: chain,
		logo: chainIconUrl(chain),
		total24h,
		change_1d,
		change_7d,
		change_1m,
		dominance: 0
	}))

	const chartData = {}

	volumesByChain.forEach(({ totalDataChart, chain }) => {
		totalDataChart.forEach(({ data }) => {
			const [dateString, volume] = data[0]
			const date = Number(dateString)

			if (chartData[date]) {
				chartData[date] = { ...chartData[date], [chain]: volume }
			} else {
				let closestTimestamp = 0

				// +- 6hours
				for (let i = date - 21600; i <= date + 21600; i++) {
					if (chartData[i]) {
						closestTimestamp = i
					}
				}

				if (!closestTimestamp) {
					chartData[date] = {}
					closestTimestamp = date
				}

				chartData[closestTimestamp] = {
					...chartData[closestTimestamp],
					[chain]: volume
				}
			}
		})
	})

	const dateKeys = Object.keys(chartData).sort((a, b) => Number(a) - Number(b))

	const volumes = chartData[dateKeys[dateKeys.length - 1]]

	// get total 24hrs volumes
	const totalVolume24hrs = Object.values(volumes).reduce((acc: number, curr: number) => (acc += curr), 0) as number

	const chainColors = {
		Others: '#AAAAAA'
	}

	const chartStacks = {
		Others: 'a'
	}

	tableData = tableData.map((row) => ({
		...row,
		dominance: getPercent(row.total24h, totalVolume24hrs)
	}))
	allChains.forEach((chain, index) => {
		// set unique color on each chain
		chainColors[chain] = getColorFromNumber(index, 9)
		chartStacks[chain] = 'a'
	})

	const formattedChartData = dateKeys.map((date) => {
		const volumesAtDate = Object.entries(chartData[date])

		if (volumesAtDate.length > 10) {
			return {
				date,
				...Object.fromEntries(volumesAtDate.slice(0, 11)),
				Others: volumesAtDate.slice(11).reduce((acc, curr: [string, number]) => (acc += curr[1]), 0)
			}
		}

		return { date, ...chartData[date] }
	})

	return {
		props: {
			tableData: tableData,
			chartData: formattedChartData,
			chartStacks,
			chainColors
		}
	}
}

const getPercent = (value: number, total: number) => {
	const ratio = total > 0 ? value / total : 0

	return Number((ratio * 100).toFixed(2))
}
