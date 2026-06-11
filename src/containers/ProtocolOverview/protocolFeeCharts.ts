import { mergeFeeExtraSeries } from '~/metrics/feeExtras'

export type ProtocolFeeExtraChartMap = Record<string, number> | null | undefined

const toSeries = (chart: ProtocolFeeExtraChartMap): Array<[number, number]> => {
	if (!chart) return []

	const series: Array<[number, number]> = []
	for (const timestamp in chart) {
		series.push([Number(timestamp), chart[timestamp]])
	}
	return series
}

export function mergeProtocolFeeExtraChartSeries({
	base,
	bribeRevenue,
	tokenTax,
	includeBribes,
	includeTokenTax
}: {
	base: Array<[number, number]>
	bribeRevenue: ProtocolFeeExtraChartMap
	tokenTax: ProtocolFeeExtraChartMap
	includeBribes: boolean
	includeTokenTax: boolean
}) {
	return mergeFeeExtraSeries({
		base,
		extraCharts: [includeBribes ? toSeries(bribeRevenue) : [], includeTokenTax ? toSeries(tokenTax) : []]
	})
}
