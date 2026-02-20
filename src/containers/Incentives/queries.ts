import { slug } from '~/utils'
import { fetchEmissionsBreakdownAggregated, fetchEmissionsChainNameMap } from './api'
import type { EmissionsBreakdownAggregatedResponse } from './api.types'
import type {
	ChainIncentivesSummary,
	DimensionEarningsEmissionMatch,
	DimensionEarningsOverview,
	DimensionEarningsOverviewBase,
	DimensionEarningsProtocol,
	DimensionEarningsProtocolWithEmissions,
	ProtocolEmissionsLookup,
	ProtocolEmissionsLookupEntry,
	ProtocolIncentivesSummary
} from './types'

const INCENTIVES_METHODOLOGY =
	'Tokens allocated to users through liquidity mining or incentive schemes, typically as part of governance or reward mechanisms.'

let emissionsChainNameMapCache: Record<string, string> | null = null

async function getEmissionsChainNameMap(): Promise<Record<string, string>> {
	if (emissionsChainNameMapCache) {
		return emissionsChainNameMapCache
	}

	const mapping = await fetchEmissionsChainNameMap()
	emissionsChainNameMapCache = mapping
	return mapping
}

function resolveInternalChainName(displayChain: string, chainNameMap: Record<string, string>) {
	return chainNameMap[displayChain] ?? slug(displayChain)
}

function groupProtocolsByParent<T extends { parentProtocol?: string | null; defillamaId: string }>(
	protocols: T[]
): Map<string, T[]> {
	const protocolGroups = new Map<string, T[]>()

	for (const protocol of protocols) {
		const parentKey = protocol.parentProtocol || protocol.defillamaId
		if (!protocolGroups.has(parentKey)) {
			protocolGroups.set(parentKey, [])
		}
		protocolGroups.get(parentKey)!.push(protocol)
	}

	return protocolGroups
}

function mergeBreakdowns(
	breakdowns: Array<Record<string, Record<string, number>> | null | undefined>
): Record<string, Record<string, number>> {
	const merged: Record<string, Record<string, number>> = {}
	for (const breakdown of breakdowns) {
		if (!breakdown) continue
		for (const chainName in breakdown) {
			const protocolData = breakdown[chainName]
			if (!merged[chainName]) {
				merged[chainName] = {}
			}
			for (const protocolName in protocolData) {
				const value = protocolData[protocolName]
				merged[chainName][protocolName] = (merged[chainName][protocolName] || 0) + value
			}
		}
	}
	return merged
}

function aggregateDimensionProtocolVersions(protocolVersions: DimensionEarningsProtocol[]): DimensionEarningsProtocol {
	const aggregatedRevenue = {
		total24h: protocolVersions.reduce((sum, p) => sum + (p.total24h ?? 0), 0),
		total7d: protocolVersions.reduce((sum, p) => sum + (p.total7d ?? 0), 0),
		total30d: protocolVersions.reduce((sum, p) => sum + (p.total30d ?? 0), 0),
		total1y: protocolVersions.reduce((sum, p) => sum + (p.total1y ?? 0), 0),
		totalAllTime: protocolVersions.reduce((sum, p) => sum + (p.totalAllTime ?? 0), 0)
	}

	const breakdowns24h: Array<Record<string, Record<string, number>>> = []
	const breakdowns30d: Array<Record<string, Record<string, number>>> = []
	for (const p of protocolVersions) {
		if (p.breakdown24h) breakdowns24h.push(p.breakdown24h)
		if (p.breakdown30d) breakdowns30d.push(p.breakdown30d)
	}
	const mergedBreakdown24h = mergeBreakdowns(breakdowns24h)
	const mergedBreakdown30d = mergeBreakdowns(breakdowns30d)

	const parentProtocol = protocolVersions[0]
	const groupedName = parentProtocol.linkedProtocols?.[0] || parentProtocol.parentProtocol || parentProtocol.name

	return {
		...parentProtocol,
		name: groupedName,
		displayName: groupedName,
		slug: slug(groupedName),
		...aggregatedRevenue,
		chains: [...new Set(protocolVersions.flatMap((p) => p.chains))],
		breakdown24h: mergedBreakdown24h,
		breakdown30d: mergedBreakdown30d
	}
}

function findMatchedEmissionForDimensionProtocol(
	protocolVersions: DimensionEarningsProtocol[],
	emissionsData: EmissionsBreakdownAggregatedResponse
): DimensionEarningsEmissionMatch | undefined {
	const parentKey = protocolVersions[0].parentProtocol || protocolVersions[0].defillamaId

	let emissions = emissionsData.protocols.find((p) => {
		if (p.defillamaId === parentKey) return true
		if (protocolVersions.some((pv) => p.defillamaId === pv.defillamaId)) return true
		if (p.linked && protocolVersions.some((pv) => p.linked.includes(pv.defillamaId))) return true
		return false
	})

	// Chain category entries sometimes only match by protocol name.
	if (!emissions && protocolVersions.length === 1 && protocolVersions[0].category === 'Chain') {
		const protocol = protocolVersions[0]
		emissions = emissionsData.protocols.find((p) => p.name === protocol.name || p.name === protocol.displayName)
	}

	return emissions
}

function calculateDimensionProtocolEarnings(
	protocolData: DimensionEarningsProtocol,
	emissions?: DimensionEarningsEmissionMatch
): DimensionEarningsProtocolWithEmissions {
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

function buildDimensionEarningsProtocols(
	data: DimensionEarningsOverview,
	emissionsData: EmissionsBreakdownAggregatedResponse | null
): DimensionEarningsProtocolWithEmissions[] {
	if (!emissionsData) return data.protocols.map((protocol) => calculateDimensionProtocolEarnings(protocol, undefined))

	const protocolGroups = groupProtocolsByParent(data.protocols)
	const processedData: DimensionEarningsProtocolWithEmissions[] = []

	for (const [_parentKey, protocolVersions] of protocolGroups) {
		const emissions = findMatchedEmissionForDimensionProtocol(protocolVersions, emissionsData)
		if (protocolVersions.length === 1) {
			processedData.push(calculateDimensionProtocolEarnings(protocolVersions[0], emissions))
		} else {
			const aggregatedProtocol = aggregateDimensionProtocolVersions(protocolVersions)
			processedData.push(calculateDimensionProtocolEarnings(aggregatedProtocol, emissions))
		}
	}

	return processedData
}

export async function getDimensionAdapterChainEarningsOverview({
	chain,
	overviewData,
	totalDataChart
}: {
	chain: string
	overviewData: DimensionEarningsOverviewBase
	totalDataChart: Array<[number, number]>
}): Promise<DimensionEarningsOverview> {
	const [emissionsData, chainNameMap] = await Promise.all([
		fetchEmissionsBreakdownAggregated(),
		getEmissionsChainNameMap()
	])

	const earningsData = buildDimensionEarningsProtocols(
		{
			...(overviewData as Omit<DimensionEarningsOverview, 'protocols' | 'totalDataChart'>),
			totalDataChart,
			protocols: overviewData.protocols
		},
		emissionsData
	)

	let filteredEarningsData = earningsData
	let chainSpecificTotal24h = 0
	let chainSpecificTotal7d = 0
	let chainSpecificTotal30d = 0
	let chainSpecificTotal1y = 0

	if (chain && chain !== 'All') {
		const internalChainName = resolveInternalChainName(chain, chainNameMap)

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

				const totalRevenue24h: number = (Object.values(protocol.breakdown24h || {}) as Record<string, number>[]).reduce(
					(sum: number, chainData) =>
						sum +
						(Object.values(chainData as Record<string, number>) as number[]).reduce(
							(s: number, v: number) => s + (v || 0),
							0
						),
					0
				)
				const totalRevenue30d: number = (Object.values(protocol.breakdown30d || {}) as Record<string, number>[]).reduce(
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
		...overviewData,
		totalDataChart,
		chain,
		total24h: chainSpecificTotal24h,
		total7d: chainSpecificTotal7d,
		total30d: chainSpecificTotal30d,
		total1y: chainSpecificTotal1y,
		protocols: filteredEarningsData
	}
}

export function extractChainIncentivesFromAggregatedEmissions({
	emissionsData,
	chainName
}: {
	emissionsData: EmissionsBreakdownAggregatedResponse | null
	chainName: string
}): ChainIncentivesSummary | null {
	if (!emissionsData) return null
	const protocolData = emissionsData.protocols.find((item) => item.chain === chainName)
	if (!protocolData) return null

	return {
		emissions24h: protocolData.emission24h ?? null,
		emissions7d: protocolData.emission7d ?? null,
		emissions30d: protocolData.emission30d ?? null
	}
}

export async function getChainIncentivesFromAggregatedEmissions(
	chainName: string
): Promise<ChainIncentivesSummary | null> {
	const emissionsData = await fetchEmissionsBreakdownAggregated()
	return extractChainIncentivesFromAggregatedEmissions({ emissionsData, chainName })
}

export function buildProtocolEmissionsLookup(
	emissionsData: EmissionsBreakdownAggregatedResponse | null
): ProtocolEmissionsLookup {
	const lookup: ProtocolEmissionsLookup = {}
	if (!emissionsData?.protocols) return lookup

	for (const emissionProtocol of emissionsData.protocols) {
		if (
			emissionProtocol.emission24h == null &&
			emissionProtocol.emission7d == null &&
			emissionProtocol.emission30d == null &&
			emissionProtocol.emissions1y == null &&
			emissionProtocol.emissionsMonthlyAverage1y == null &&
			emissionProtocol.emissionsAllTime == null
		) {
			continue
		}

		const key = emissionProtocol.defillamaId || emissionProtocol.name
		const entry: ProtocolEmissionsLookupEntry = {
			emissions24h: emissionProtocol.emission24h ?? null,
			emissions7d: emissionProtocol.emission7d ?? null,
			emissions30d: emissionProtocol.emission30d ?? null,
			emissions1y: emissionProtocol.emissions1y ?? null,
			emissionsMonthlyAverage1y: emissionProtocol.emissionsMonthlyAverage1y ?? null,
			emissionsAllTime: emissionProtocol.emissionsAllTime ?? null,
			name: emissionProtocol.name
		}

		lookup[key] = entry
	}

	return lookup
}

export async function getProtocolEmissionsLookupFromAggregated(): Promise<ProtocolEmissionsLookup> {
	const emissionsData = await fetchEmissionsBreakdownAggregated()
	return buildProtocolEmissionsLookup(emissionsData)
}

export function extractProtocolIncentivesFromAggregatedEmissions({
	emissionsData,
	protocolId,
	protocolDisplayName
}: {
	emissionsData: EmissionsBreakdownAggregatedResponse | null
	protocolId: string
	protocolDisplayName: string
}): ProtocolIncentivesSummary | null {
	if (!emissionsData) return null

	const protocolEmissionsData = emissionsData.protocols.find((item) =>
		protocolId.startsWith('parent#') ? item.name === protocolDisplayName : item.defillamaId === protocolId
	)

	if (!protocolEmissionsData) return null

	return {
		emissions24h: protocolEmissionsData.emission24h ?? null,
		emissions7d: protocolEmissionsData.emission7d ?? null,
		emissions30d: protocolEmissionsData.emission30d ?? null,
		emissionsAllTime: protocolEmissionsData.emissionsAllTime ?? null,
		emissionsMonthlyAverage1y: protocolEmissionsData.emissionsMonthlyAverage1y ?? null,
		methodology: INCENTIVES_METHODOLOGY
	}
}

export async function getProtocolIncentivesFromAggregatedEmissions({
	protocolId,
	protocolDisplayName
}: {
	protocolId: string
	protocolDisplayName: string
}): Promise<ProtocolIncentivesSummary | null> {
	const emissionsData = await fetchEmissionsBreakdownAggregated()
	return extractProtocolIncentivesFromAggregatedEmissions({
		emissionsData,
		protocolId,
		protocolDisplayName
	})
}
