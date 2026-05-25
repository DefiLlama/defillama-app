import { SERVER_URL } from '~/constants'
import { fetchJson } from '~/utils/async'
import { detectAnomalies } from './detector'
import type { AnomalyDetectionProps } from './types'

export async function getAnomalyDetectionData(): Promise<AnomalyDetectionProps> {
	const [protocolsRes, feesRes] = await Promise.all([
		fetchJson<{ protocols: any[] }>(`${SERVER_URL}/lite/protocols2`).catch(() => ({ protocols: [] })),
		fetchJson<{ protocols: any[] }>(
			`${SERVER_URL}/overview/fees?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`
		).catch(() => ({ protocols: [] }))
	])

	const protocols = (protocolsRes.protocols ?? []).map((p: any) => ({
		name: p.name,
		slug: p.slug ?? p.name,
		logo: p.logo ?? '',
		category: p.category ?? null,
		tvl: typeof p.tvl === 'number' ? p.tvl : null,
		change_1d: typeof p.change_1d === 'number' ? p.change_1d : null,
		change_7d: typeof p.change_7d === 'number' ? p.change_7d : null
	}))

	const fees = (feesRes.protocols ?? []).map((p: any) => {
		const total30d = Number(p.total30d)
		const change_30dover30d = Number(p.change_30dover30d)
		return {
			name: p.name,
			slug: p.slug ?? p.name,
			total30d: isFinite(total30d) ? total30d : null,
			change_30dover30d: isFinite(change_30dover30d) ? change_30dover30d : null
		}
	})

	const rows = detectAnomalies(protocols, fees)

	return {
		rows,
		lastUpdated: new Date().toISOString()
	}
}
