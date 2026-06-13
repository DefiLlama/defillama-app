import { toNextHandler } from '~/server/api/nextAdapter'
import { protocolCharts } from '~/server/api/routes/charts'

export default toNextHandler(protocolCharts)
