import { DATASETS_SERVER_URL } from '~/constants'
import { fetchJson, getFastJsonTimeoutMs } from '~/utils/async'
import type { IChainOverviewData } from './types'

type HomepageUnlocksSummary = {
	schemaVersion: 1
	generatedAtSec: number
	windowDays: number
	chart: NonNullable<IChainOverviewData['unlocks']>['chart']
	total14d: number
}

const HOMEPAGE_UNLOCKS_SUMMARY_URL = `${DATASETS_SERVER_URL}/homepage/unlocks-summary.json`

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value)
}

function isBreakdownEntry(value: unknown): value is { token: string; value: number; pct: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { token?: unknown }).token === 'string' &&
		isFiniteNumber((value as { value?: unknown }).value) &&
		typeof (value as { pct?: unknown }).pct === 'string'
	)
}

function isChartEntry(value: unknown): value is NonNullable<IChainOverviewData['unlocks']>['chart'][number] {
	return (
		typeof value === 'object' &&
		value !== null &&
		isFiniteNumber((value as { date?: unknown }).date) &&
		isFiniteNumber((value as { total?: unknown }).total) &&
		Array.isArray((value as { breakdown?: unknown }).breakdown) &&
		(value as { breakdown: unknown[] }).breakdown.every(isBreakdownEntry)
	)
}

export function parseHomepageUnlocksSummary(raw: unknown): IChainOverviewData['unlocks'] {
	if (typeof raw !== 'object' || raw === null) return null
	const value = raw as Partial<HomepageUnlocksSummary>
	if (value.schemaVersion !== 1) return null
	if (!Array.isArray(value.chart) || !value.chart.every(isChartEntry)) return null
	if (!isFiniteNumber(value.total14d)) return null

	return {
		chart: value.chart,
		total14d: value.total14d
	}
}

export async function fetchHomepageUnlocksSummary(): Promise<IChainOverviewData['unlocks']> {
	try {
		const raw = await fetchJson<unknown>(HOMEPAGE_UNLOCKS_SUMMARY_URL, { timeout: getFastJsonTimeoutMs() })
		return parseHomepageUnlocksSummary(raw)
	} catch (error) {
		console.error('Failed to fetch homepage unlocks summary:', error)
		return null
	}
}
