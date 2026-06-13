import { protocolTvlBreakdown } from '~/containers/ProtocolOverview/server/tvlBreakdowns'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(protocolTvlBreakdown)
