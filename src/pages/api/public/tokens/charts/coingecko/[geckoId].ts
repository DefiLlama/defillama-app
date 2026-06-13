import { coingeckoChart } from '~/containers/Token/server/charts'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(coingeckoChart)
