import { toNextHandler } from '~/server/api/nextAdapter'
import { chainCharts } from '~/containers/ChainOverview/server/charts'

export default toNextHandler(chainCharts)
