import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { ProtocolAdaptorSummaryResponse } from '~/api/categories/adaptors/types'
import { chartBreakdownByTokens, chartBreakdownByVersion } from '~/api/categories/adaptors/utils'
import { CHART_TYPES } from './types'

export const chartFormatterBy = (chartType: CHART_TYPES) => {
	switch (chartType) {
		case 'version':
			return (
				_mainChart: [IJoin2ReturnType, string[]],
				totalDataChartBreakdown: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']
			) => chartBreakdownByVersion(totalDataChartBreakdown ?? [])
		case 'tokens':
			return (
				_mainChart: [IJoin2ReturnType, string[]],
				totalDataChartBreakdown: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']
			) => chartBreakdownByTokens(totalDataChartBreakdown ?? [])
		case 'chain':
		default:
			return (
				mainChart: [IJoin2ReturnType, string[]],
				_totalDataChartBreakdown: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']
			): [IJoin2ReturnType, string[]] => mainChart
	}
}
