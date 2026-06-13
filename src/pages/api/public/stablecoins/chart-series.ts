import { stablecoinChartSeries } from '~/containers/Stablecoins/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(stablecoinChartSeries)
