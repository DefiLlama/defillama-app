import { chainCharts } from '~/containers/ChainOverview/server/charts'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(chainCharts)
