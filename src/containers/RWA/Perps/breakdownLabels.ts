import type { IRWAPerpsMarket } from './api.types'
import type {
	IRWAPerpsTimeSeriesRow,
	RWAPerpsOverviewBreakdown,
	RWAPerpsOverviewNonTimeSeriesBreakdown,
	RWAPerpsOverviewTreemapBreakdown,
	RWAPerpsVenueBreakdown,
	RWAPerpsVenueTreemapBreakdown
} from './types'

export const UNKNOWN_BREAKDOWN_LABEL = 'Unknown'

type SharedBreakdown = RWAPerpsOverviewTreemapBreakdown | RWAPerpsVenueTreemapBreakdown

type SharedBreakdownRow = Pick<IRWAPerpsTimeSeriesRow, 'coin' | 'venue' | 'referenceAsset' | 'assetClass'>

function firstNonEmptyString(values: Array<string | null | undefined>): string | null {
	for (const value of values) {
		if (typeof value === 'string' && value.trim().length > 0) {
			return value.trim()
		}
	}

	return null
}

export function normalizeRWAPerpsBreakdownLabel(value: string | null | undefined): string {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : UNKNOWN_BREAKDOWN_LABEL
}

export function getRWAPerpsReferenceAssetBreakdownLabel(
	row: Pick<SharedBreakdownRow, 'coin' | 'referenceAsset'>
): string {
	const [_, rawCoinLabel] = row.coin.split(':')
	return normalizeRWAPerpsBreakdownLabel(firstNonEmptyString([row.referenceAsset, rawCoinLabel, row.coin]))
}

export function getRWAPerpsCoinBreakdownLabel(row: Pick<SharedBreakdownRow, 'coin'>): string {
	return normalizeRWAPerpsBreakdownLabel(row.coin)
}

export function getRWAPerpsSharedBreakdownLabel(row: SharedBreakdownRow, breakdown: SharedBreakdown): string {
	switch (breakdown) {
		case 'venue':
			return normalizeRWAPerpsBreakdownLabel(row.venue)
		case 'assetClass':
			return normalizeRWAPerpsBreakdownLabel(row.assetClass)
		case 'referenceAsset':
			return getRWAPerpsReferenceAssetBreakdownLabel(row)
		case 'coin':
			return getRWAPerpsCoinBreakdownLabel(row)
		default:
			return assertNever(breakdown)
	}
}

export function getRWAPerpsOverviewBreakdownLabel(
	row: SharedBreakdownRow,
	breakdown: RWAPerpsOverviewBreakdown
): string {
	return getRWAPerpsSharedBreakdownLabel(row, breakdown)
}

export function getRWAPerpsVenueBreakdownLabel(row: SharedBreakdownRow, breakdown: RWAPerpsVenueBreakdown): string {
	return getRWAPerpsSharedBreakdownLabel(row, breakdown)
}

export function getRWAPerpsOverviewSnapshotBreakdownLabel(
	row: IRWAPerpsMarket,
	breakdown: RWAPerpsOverviewNonTimeSeriesBreakdown
): string {
	return getRWAPerpsSharedBreakdownLabel(row, breakdown)
}

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}
