import { getTokenRiskTimeline } from './api'
import type { RiskTimelineResponse } from './tokenRiskTimeline.types'

export async function getTokenRiskTimelineData(tokenSymbol: string): Promise<RiskTimelineResponse | null> {
	if (!tokenSymbol) return null
	const data = await getTokenRiskTimeline(tokenSymbol)
	if (!data?.entries?.length) return null
	return data
}
