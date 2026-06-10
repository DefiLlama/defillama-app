import { TVL_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import type { IProtocolTaxonomyPageData } from './types'

type ProtocolTaxonomyProtocol = IProtocolTaxonomyPageData['protocols'][number]

export function getEnabledProtocolTaxonomyTvls(tvlSettings: Record<string, boolean>) {
	return TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])
}

export function applyProtocolTaxonomyTvlSettings({
	protocols,
	charts,
	extraTvlCharts,
	tvlSettings,
	effectiveCategory
}: {
	protocols: IProtocolTaxonomyPageData['protocols']
	charts: IProtocolTaxonomyPageData['charts']
	extraTvlCharts: IProtocolTaxonomyPageData['extraTvlCharts']
	tvlSettings: Record<string, boolean>
	effectiveCategory: IProtocolTaxonomyPageData['effectiveCategory']
}): {
	finalProtocols: IProtocolTaxonomyPageData['protocols']
	charts: IProtocolTaxonomyPageData['charts']
} {
	const enabledTvls = getEnabledProtocolTaxonomyTvls(tvlSettings)

	if (enabledTvls.length === 0) return { finalProtocols: protocols, charts }

	const finalProtocols = protocols.map((protocol) => applyProtocolRowTvlSettings(protocol, enabledTvls))
	const shouldMirrorBorrowedChart = effectiveCategory === 'Lending' && enabledTvls.includes('borrowed')
	const finalSource: IProtocolTaxonomyPageData['charts']['dataset']['source'] = charts.dataset.source.map((row) => {
		const timestampKey = row.timestamp
		let extraSum = 0
		if (timestampKey != null) {
			for (const extraTvlKey of enabledTvls) {
				extraSum += extraTvlCharts[extraTvlKey]?.[timestampKey] ?? 0
			}
		}

		const currentTvlValue = typeof row.TVL === 'number' ? row.TVL : Number(row.TVL ?? 0)
		const safeCurrentTvlValue = Number.isFinite(currentTvlValue) ? currentTvlValue : 0
		const nextTvlValue = safeCurrentTvlValue + extraSum
		const timestamp = row.timestamp

		if (shouldMirrorBorrowedChart) {
			return { ...row, timestamp, TVL: nextTvlValue, 'Active Loans': nextTvlValue }
		}

		return { ...row, timestamp, TVL: nextTvlValue }
	})

	return {
		finalProtocols,
		charts: {
			...charts,
			dataset: { ...charts.dataset, source: finalSource }
		}
	}
}

function applyProtocolRowTvlSettings(
	protocol: ProtocolTaxonomyProtocol,
	enabledTvls: Array<string>
): ProtocolTaxonomyProtocol {
	let tvl = protocol.tvl
	for (const extraTvlKey of enabledTvls) {
		if (protocol.extraTvls[extraTvlKey] == null) continue
		tvl = (tvl ?? 0) + (protocol.extraTvls[extraTvlKey] ?? 0)
	}

	const updated = { ...protocol, tvl }
	if (updated.subRows?.length > 0) {
		updated.subRows = updated.subRows.map((subRow) => applyProtocolRowTvlSettings(subRow, enabledTvls))
	}
	return updated
}
