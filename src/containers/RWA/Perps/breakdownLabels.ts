import type { IRWAPerpsMarket } from './api.types'
import type {
	IRWAPerpsTimeSeriesRow,
	RWAPerpsOverviewBreakdown,
	RWAPerpsOverviewSnapshotBreakdown,
	RWAPerpsOverviewTreemapBreakdown,
	RWAPerpsVenueBreakdown,
	RWAPerpsVenueSnapshotBreakdown,
	RWAPerpsVenueTreemapBreakdown
} from './types'

export const UNKNOWN_BREAKDOWN_LABEL = 'Unknown'

type SharedBreakdown = RWAPerpsOverviewTreemapBreakdown | RWAPerpsVenueTreemapBreakdown

type SharedBreakdownRow = Pick<IRWAPerpsTimeSeriesRow, 'contract' | 'venue' | 'referenceAsset' | 'assetClass'> & {
	referenceAssetGroup?: string | null
}

export function normalizeRWAPerpsBreakdownLabel(value: string | null | undefined): string {
	return value && value.length > 0 ? value : UNKNOWN_BREAKDOWN_LABEL
}

export function getRWAPerpsBaseAssetBreakdownLabel(
	row: Pick<SharedBreakdownRow, 'contract' | 'referenceAsset'>
): string {
	return normalizeRWAPerpsBreakdownLabel(row.referenceAsset ?? row.contract.split(':')[1] ?? row.contract)
}

export function getRWAPerpsContractBreakdownLabel(row: Pick<SharedBreakdownRow, 'contract'>): string {
	return normalizeRWAPerpsBreakdownLabel(row.contract)
}

export function getRWAPerpsAssetClassBreakdownLabel(row: Pick<SharedBreakdownRow, 'assetClass'>): string {
	return normalizeRWAPerpsBreakdownLabel(row.assetClass?.[0])
}

export function getRWAPerpsAssetGroupBreakdownLabel(row: Pick<SharedBreakdownRow, 'referenceAssetGroup'>): string {
	return normalizeRWAPerpsBreakdownLabel(row.referenceAssetGroup)
}

export function getRWAPerpsSharedBreakdownLabel(row: SharedBreakdownRow, breakdown: SharedBreakdown): string {
	switch (breakdown) {
		case 'venue':
			return normalizeRWAPerpsBreakdownLabel(row.venue)
		case 'assetClass':
			return getRWAPerpsAssetClassBreakdownLabel(row)
		case 'baseAsset':
			return getRWAPerpsBaseAssetBreakdownLabel(row)
		case 'assetGroup':
			return getRWAPerpsAssetGroupBreakdownLabel(row)
		case 'contract':
			return getRWAPerpsContractBreakdownLabel(row)
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
	breakdown: RWAPerpsOverviewSnapshotBreakdown
): string {
	return getRWAPerpsSharedBreakdownLabel(row, breakdown)
}

export function getRWAPerpsVenueSnapshotBreakdownLabel(
	row: IRWAPerpsMarket,
	breakdown: RWAPerpsVenueSnapshotBreakdown
): string {
	return getRWAPerpsSharedBreakdownLabel(row, breakdown)
}

function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`)
}
