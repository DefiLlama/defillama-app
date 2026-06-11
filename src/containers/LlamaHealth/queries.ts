import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import { computeHealthRows } from './scoring'
import type { IRawFeesProtocol, IRawProtocol, IRawRevenueProtocol, LlamaHealthProps } from './types'

interface ProtocolsApiResponse {
	protocols: IRawProtocol[]
}

interface FeesApiResponse {
	protocols: IRawFeesProtocol[]
}

export async function getLlamaHealthData(): Promise<LlamaHealthProps> {
	const [protocolsRes, feesRes, revenueRes] = await Promise.all([
		fetchJson<ProtocolsApiResponse>(`${SERVER_URL}/lite/protocols2`).catch(() => ({ protocols: [] })),
		fetchJson<FeesApiResponse>(
			`${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`
		).catch(() => ({ protocols: [] })),
		fetchJson<FeesApiResponse>(
			`${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue`
		).catch(() => ({ protocols: [] }))
	])

	const rawProtocols: IRawProtocol[] = (protocolsRes.protocols ?? []).map((p: any) => ({
		name: p.name,
		slug: p.slug ?? p.name,
		category: p.category ?? null,
		chains: Array.isArray(p.chains) ? p.chains : [],
		tvl: typeof p.tvl === 'number' ? p.tvl : null,
		change_1d: typeof p.change_1d === 'number' ? p.change_1d : null,
		change_7d: typeof p.change_7d === 'number' ? p.change_7d : null,
		audits: p.audits != null ? String(p.audits) : null,
		listedAt: typeof p.listedAt === 'number' ? p.listedAt : null,
		logo: p.logo ?? ''
	}))

	const rawFees: IRawFeesProtocol[] = (feesRes.protocols ?? []).map((p: any) => ({
		name: p.name,
		slug: p.slug ?? p.name,
		category: p.category ?? null,
		total24h: p.total24h ?? null,
		total7d: p.total7d ?? null,
		total30d: p.total30d ?? null,
		total60dto30d: p.total60dto30d ?? null,
		change_7dover7d: p.change_7dover7d ?? null,
		change_30dover30d: p.change_30dover30d ?? null
	}))

	const rawRevenue: IRawRevenueProtocol[] = (revenueRes.protocols ?? []).map((p: any) => ({
		name: p.name,
		slug: p.slug ?? p.name,
		total30d: p.total30d ?? null
	}))

	const rows = computeHealthRows(rawProtocols, rawFees, rawRevenue)

	return { rows }
}
