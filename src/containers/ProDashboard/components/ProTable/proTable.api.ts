'use no memo'

import { DIMENSIONS_OVERVIEW_API } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type { ProTableDimensionProtocol } from './proTable.types'

type OverviewProtocolsResponse = {
	protocols?: ProTableDimensionProtocol[]
} | null

const getOverviewApiUrl = (category: string, chain?: string) =>
	`${DIMENSIONS_OVERVIEW_API}/${category}${chain && chain !== 'All' ? `/${slug(chain)}` : ''}`

const toProtocolMap = (response: OverviewProtocolsResponse): Record<string, ProTableDimensionProtocol> => {
	const protocolMap: Record<string, ProTableDimensionProtocol> = {}
	for (const protocol of response?.protocols ?? []) {
		if (protocol.category === 'Chain' || !protocol.name) continue
		protocolMap[protocol.name] = protocol
	}
	return protocolMap
}

// used in ProTable fees/revenue dataset
export const getFeesAndRevenueProtocolsByChain = async ({ chain }: { chain?: string }) => {
	const apiUrl = `${getOverviewApiUrl('fees', chain)}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`

	const [fees, revenue, holdersRevenue] = await Promise.all([
		(fetchJson(apiUrl) as Promise<OverviewProtocolsResponse>).catch((err) => {
			console.log('Error at ', apiUrl, err)
			return null
		}),
		(fetchJson(`${apiUrl}&dataType=dailyRevenue`) as Promise<OverviewProtocolsResponse>).catch((err) => {
			console.log('Error at ', `${apiUrl}&dataType=dailyRevenue`, err)
			return null
		}),
		(fetchJson(`${apiUrl}&dataType=dailyHoldersRevenue`) as Promise<OverviewProtocolsResponse>).catch((err) => {
			console.log('Error at ', `${apiUrl}&dataType=dailyHoldersRevenue`, err)
			return null
		})
	])

	const revenueByProtocol = toProtocolMap(revenue)
	const holdersRevenueByProtocol = toProtocolMap(holdersRevenue)

	const mergedProtocols: ProTableDimensionProtocol[] = []
	for (const protocol of fees?.protocols ?? []) {
		if (protocol.category === 'Chain' || !protocol.name) continue

		const revenueProtocol = revenueByProtocol[protocol.name]
		const holdersRevenueProtocol = holdersRevenueByProtocol[protocol.name]

		mergedProtocols.push({
			...protocol,
			displayName: protocol.displayName ?? protocol.name,
			revenue24h: revenueProtocol?.total24h ?? null,
			revenue7d: revenueProtocol?.total7d ?? null,
			revenue30d: revenueProtocol?.total30d ?? null,
			revenue1y: revenueProtocol?.total1y ?? null,
			averageRevenue1y: revenueProtocol?.average1y ?? null,
			feesChange_1d: protocol.change_1d ?? null,
			feesChange_7d: protocol.change_7d ?? null,
			feesChange_1m: protocol.change_1m ?? null,
			feesChange_7dover7d: protocol.change_7dover7d ?? null,
			feesChange_30dover30d: protocol.change_30dover30d ?? null,
			revenueChange_1d: revenueProtocol?.change_1d ?? null,
			revenueChange_7d: revenueProtocol?.change_7d ?? null,
			revenueChange_1m: revenueProtocol?.change_1m ?? null,
			revenueChange_7dover7d: revenueProtocol?.change_7dover7d ?? null,
			revenueChange_30dover30d: revenueProtocol?.change_30dover30d ?? null,
			holdersRevenue24h: holdersRevenueProtocol?.total24h ?? null,
			holdersRevenue30d: holdersRevenueProtocol?.total30d ?? null,
			holdersRevenueChange_7dover7d: holdersRevenueProtocol?.change_7dover7d ?? null,
			holdersRevenueChange_30dover30d: holdersRevenueProtocol?.change_30dover30d ?? null,
			pf: protocol.pf ?? null,
			ps: protocol.ps ?? null
		})
	}

	return mergedProtocols
}

export const getDexVolumeByChain = async ({
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown
}: {
	chain?: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
}) =>
	(fetchJson(
		`${getOverviewApiUrl('dexs', chain)}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	) as Promise<OverviewProtocolsResponse>).catch((err) => {
		console.log(err)
		return null
	})

export const getPerpsVolumeByChain = async ({
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown
}: {
	chain?: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
}) =>
	(fetchJson(
		`${getOverviewApiUrl('derivatives', chain)}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	) as Promise<OverviewProtocolsResponse>).catch((err) => {
		console.log(err)
		return null
	})

export const getOpenInterestByChain = async ({ chain }: { chain?: string }) =>
	(fetchJson(
		`${getOverviewApiUrl('open-interest', chain)}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=openInterestAtEnd`
	) as Promise<OverviewProtocolsResponse>).catch((err) => {
		console.log(err)
		return null
	})
