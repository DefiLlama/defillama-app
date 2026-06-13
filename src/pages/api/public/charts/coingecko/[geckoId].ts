import { toNextHandler } from '~/server/api/nextAdapter'
import { coingeckoChart } from '~/containers/Token/server/charts'

export default toNextHandler(coingeckoChart)
