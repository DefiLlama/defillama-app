import { adapterMetricByChainBreakdown } from '~/containers/AdapterMetrics/server/breakdownRoutes'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(adapterMetricByChainBreakdown)
