import { toNextHandler } from '~/server/api/nextAdapter'
import { chainCharts } from '~/server/api/routes/charts'

export default toNextHandler(chainCharts)
