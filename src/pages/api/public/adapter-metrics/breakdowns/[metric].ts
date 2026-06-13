import { adapterMetricBreakdown } from '~/containers/AdapterMetrics/server/breakdowns'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(adapterMetricBreakdown)
