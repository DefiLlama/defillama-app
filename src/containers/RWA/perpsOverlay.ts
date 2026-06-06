import type { IRWAInitialTimeSeriesDataset, RWAPerpsContractOverlayRow } from './api.types'
import { normalizeRwaAssetGroup } from './assetGroup'
import { buildRwaOpenInterestDataset } from './chartAggregation'
import { getRwaPlatforms, UNKNOWN_PLATFORM } from './grouping'
import type { IRWAPerpsBreakdownChartResponse, IRWAPerpsMarket } from './Perps/api.types'
import { toRWAPerpsBreakdownChartDataset } from './Perps/breakdownDataset'
import { rwaSlug } from './rwaSlug'

export const getRealRwaPlatforms = (value: Parameters<typeof getRwaPlatforms>[0]) =>
	getRwaPlatforms(value).filter((platform) => platform !== UNKNOWN_PLATFORM && rwaSlug(platform) !== 'unknown')

export function toRWAPerpsContractOverlayRow(market: IRWAPerpsMarket): RWAPerpsContractOverlayRow {
	return {
		id: market.id,
		kind: 'perps',
		detailHref: `/rwa/perps/contract/${encodeURIComponent(market.contract)}`,
		contract: market.contract,
		assetName: market.referenceAsset ?? market.contract,
		ticker: market.contract,
		primaryChain: null,
		chain: null,
		price: market.price,
		openInterest: market.openInterest,
		volume24h: market.volume24h,
		volume30d: market.volume30d,
		assetGroup: market.referenceAssetGroup,
		parentPlatform: market.parentPlatform,
		category: market.category,
		assetClass: market.assetClass,
		accessModel: market.accessModel,
		type: 'Perp',
		rwaClassification: market.rwaClassification,
		issuer: market.issuer,
		redeemable: null,
		attestations: null,
		cexListed: null,
		kycForMintRedeem: null,
		kycAllowlistedWhitelistedToTransferHold: null,
		transferable: null,
		selfCustody: null,
		stablecoin: null,
		governance: null,
		trueRWA: false,
		onChainMcap: null,
		activeMcap: null,
		defiActiveTvl: null,
		defiActiveTvlByChain: null
	}
}

export function buildRWAPerpsContractOverlayRows({
	markets,
	selectedCategory,
	selectedPlatform,
	selectedAssetGroup,
	excludedAssetNames
}: {
	markets: IRWAPerpsMarket[]
	selectedCategory?: string
	selectedPlatform?: string
	selectedAssetGroup?: string
	excludedAssetNames: Set<string>
}): RWAPerpsContractOverlayRow[] {
	const rows: RWAPerpsContractOverlayRow[] = []

	for (const market of markets) {
		const row = toRWAPerpsContractOverlayRow(market)
		const hasCategoryMatch = selectedCategory
			? (row.category ?? []).some((category) => rwaSlug(category) === selectedCategory)
			: true
		const hasPlatformMatch = selectedPlatform
			? getRealRwaPlatforms(row.parentPlatform).some((platform) => rwaSlug(platform) === selectedPlatform)
			: true
		const hasAssetGroupMatch = selectedAssetGroup
			? rwaSlug(normalizeRwaAssetGroup(row.assetGroup)) === selectedAssetGroup
			: true

		if (!hasCategoryMatch || !hasPlatformMatch || !hasAssetGroupMatch || excludedAssetNames.has(row.assetName)) {
			continue
		}

		rows.push(row)
	}

	return rows
}

export function buildRWAPerpsOpenInterestOverlayDataset({
	rows,
	breakdownRows
}: {
	rows: RWAPerpsContractOverlayRow[]
	breakdownRows: IRWAPerpsBreakdownChartResponse | null
}): IRWAInitialTimeSeriesDataset | null {
	if (breakdownRows == null) return null
	return buildRwaOpenInterestDataset(rows, toRWAPerpsBreakdownChartDataset(breakdownRows))
}
