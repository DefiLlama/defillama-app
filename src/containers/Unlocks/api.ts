import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import type { ProtocolEmissionDetail, ProtocolEmission } from './api.types'
import type { ProtocolEmissionsChartsResult, ProtocolEmissionsFullResult, ProtocolEmissionsScheduleResult, ProtocolEmissionsPieResult, ProtocolEmissionResult } from './types'

function parseProtocolEmissionApiResponse(raw: unknown): ProtocolEmissionDetail | null {
	if (!raw) return null

	// Many endpoints respond as `{ body: string }`.
	const body =
		typeof raw === 'object' && raw !== null && 'body' in raw ? (raw as { body: unknown }).body : raw

	if (body == null) return null
	if (typeof body === 'string') {
		try {
			return JSON.parse(body) as ProtocolEmissionDetail
		} catch {
			return null
		}
	}

	return body as ProtocolEmissionDetail
}

export async function fetchProtocolEmission(protocolName: string): Promise<ProtocolEmissionDetail | null> {
	if (!protocolName) return null
	const encodedProtocolName = encodeURIComponent(protocolName)
	const raw = await fetchJson(`${SERVER_URL}/emission/${encodedProtocolName}`).catch((error) => {
		console.error(`Failed to fetch protocol emission for ${protocolName}:`, error)
		return null as unknown
	})
	return parseProtocolEmissionApiResponse(raw)
}

export async function getProtocolEmissionsList(): Promise<Array<{ name: string; token: string }>> {
	try {
		const res = await fetchJson(`${SERVER_URL}/emissions`)
		if (!Array.isArray(res)) return []
		return res.map((protocol: ProtocolEmission) => ({
			name: protocol.name,
			token: protocol.token
		}))
	} catch (error) {
		console.error('Failed to fetch protocol emissions list:', error)
		return []
	}
}

export async function getAllProtocolEmissionsCached(): Promise<ProtocolEmission[] | null> {
	try {
		const res = await fetchJson(`${SERVER_URL}/emissions`)
		if (!Array.isArray(res)) return null
		return res as ProtocolEmission[]
	} catch (error) {
		console.error('Failed to fetch all protocol emissions:', error)
		return null
	}
}

export async function getEmissionsProtocolsListCached(): Promise<string[] | null> {
	try {
		const res = await fetchJson(`${SERVER_URL}/emissionsProtocolsList`)
		if (!Array.isArray(res)) return null
		return res as string[]
	} catch (error) {
		console.error('Failed to fetch emissions protocols list:', error)
		return null
	}
}

export async function getProtocolEmissionsCharts(protocolName: string): Promise<ProtocolEmissionsChartsResult> {
	const empty: ProtocolEmissionsChartsResult = {
		chartData: { documented: [], realtime: [] },
		unlockUsdChart: null
	}

	if (!protocolName) return empty

	const res = await fetchProtocolEmission(protocolName)
	if (!res) return empty

	return {
		chartData: {
			documented: [], // Will be populated by buildEmissionsSeriesAndCategories
			realtime: []
		},
		unlockUsdChart: res.unlockUsdChart ?? null
	}
}

export async function getProtocolEmissionsForCharts(protocolName: string): Promise<ProtocolEmissionsFullResult> {
	const empty: ProtocolEmissionsFullResult = {
		chartData: { documented: [], realtime: [] },
		pieChartData: { documented: [], realtime: [] },
		stackColors: { documented: {}, realtime: {} },
		datasets: {
			documented: { source: [], dimensions: ['timestamp'] },
			realtime: { source: [], dimensions: ['timestamp'] }
		},
		chartsConfigs: { documented: [], realtime: [] },
		categories: { documented: [], realtime: [] },
		hallmarks: { documented: [], realtime: [] },
		sources: [],
		notes: [],
		events: [],
		futures: {},
		token: null,
		geckoId: null,
		name: null,
		unlockUsdChart: null,
		categoriesBreakdown: null,
		tokenAllocation: { documented: {}, realtime: {} }
	}

	if (!protocolName) return empty

	const res = await fetchProtocolEmission(protocolName)
	if (!res) return empty

	const { metadata, name, futures } = res

	// These would be populated by the helper functions in queries.ts
	return {
		...empty,
		sources: metadata?.sources ?? [],
		notes: metadata?.notes ?? [],
		token: metadata?.token ?? null,
		geckoId: res?.gecko_id ?? null,
		name: name || null,
		futures: futures ?? {},
		unlockUsdChart: res.unlockUsdChart ?? null
	}
}

export async function getProtocolEmissionsScheduleData(
	protocolName: string
): Promise<ProtocolEmissionsScheduleResult> {
	const empty: ProtocolEmissionsScheduleResult = {
		datasets: {
			documented: { source: [], dimensions: ['timestamp'] },
			realtime: { source: [], dimensions: ['timestamp'] }
		},
		chartsConfigs: { documented: [], realtime: [] },
		categories: { documented: [], realtime: [] },
		hallmarks: { documented: [], realtime: [] }
	}

	const res = await fetchProtocolEmission(protocolName)
	if (!res) return empty

	// Populated by helper functions
	return empty
}

export async function getProtocolEmissionsPieData(protocolName: string): Promise<ProtocolEmissionsPieResult> {
	const empty: ProtocolEmissionsPieResult = {
		pieChartData: { documented: [], realtime: [] },
		stackColors: { documented: {}, realtime: {} },
		meta: {}
	}

	const res = await fetchProtocolEmission(protocolName)
	if (!res) return empty

	// Get all emissions to find meta
	const allEmissions = await getAllProtocolEmissionsCached()
	const meta = allEmissions?.find((p) => p?.token === res?.metadata?.token) ?? {}

	return { ...empty, meta }
}

export async function getProtocolEmissons(protocolName: string): Promise<ProtocolEmissionResult> {
	const empty: ProtocolEmissionResult = {
		chartData: { documented: [], realtime: [] },
		pieChartData: { documented: [], realtime: [] },
		stackColors: { documented: {}, realtime: {} },
		datasets: {
			documented: { source: [], dimensions: ['timestamp'] },
			realtime: { source: [], dimensions: ['timestamp'] }
		},
		chartsConfigs: { documented: [], realtime: [] },
		meta: {},
		sources: [],
		notes: [],
		events: [],
		token: null,
		geckoId: null,
		upcomingEvent: null,
		tokenAllocation: { documented: {}, realtime: {} },
		futures: {},
		categories: { documented: [], realtime: [] },
		categoriesBreakdown: null,
		hallmarks: { documented: [], realtime: [] },
		name: null,
		tokenPrice: {},
		unlockUsdChart: null
	}

	try {
		const list = await getEmissionsProtocolsListCached()
		if (!list?.includes(protocolName)) {
			return empty
		}

		const [res, allEmissions] = await Promise.all([
			fetchProtocolEmission(protocolName),
			getAllProtocolEmissionsCached()
		])

		if (!res) {
			return empty
		}

		const { metadata, name, futures } = res

		return {
			...empty,
			meta: allEmissions?.find((p) => p?.token === metadata?.token) ?? {},
			sources: metadata?.sources ?? [],
			notes: metadata?.notes ?? [],
			token: metadata?.token ?? null,
			geckoId: res?.gecko_id ?? null,
			name: name || null,
			futures: futures ?? {}
		}
	} catch (error) {
		console.error(`Failed to get protocol emissions for ${protocolName}:`, error)
		return empty
	}
}
