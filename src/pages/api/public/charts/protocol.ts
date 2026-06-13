import { protocolCharts } from '~/containers/ProtocolOverview/server/charts'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(protocolCharts)
