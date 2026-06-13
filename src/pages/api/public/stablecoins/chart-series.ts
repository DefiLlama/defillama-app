import { toNextHandler } from '~/server/api/nextAdapter'
import { stablecoinChartSeries } from '~/server/api/routes/stablecoins'

export default toNextHandler(stablecoinChartSeries)
