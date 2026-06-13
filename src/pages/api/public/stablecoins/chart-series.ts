import { toNextHandler } from '~/server/api/nextAdapter'
import { stablecoinChartSeries } from '~/containers/Stablecoins/server/api'

export default toNextHandler(stablecoinChartSeries)
