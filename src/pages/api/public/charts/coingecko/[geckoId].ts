import { toNextHandler } from '~/server/api/nextAdapter'
import { coingeckoChart } from '~/server/api/routes/charts'

export default toNextHandler(coingeckoChart)
