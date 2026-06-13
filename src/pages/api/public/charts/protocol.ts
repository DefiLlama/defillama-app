import { toNextHandler } from '~/server/api/nextAdapter'
import { protocolCharts } from '~/containers/ProtocolOverview/server/charts'

export default toNextHandler(protocolCharts)
