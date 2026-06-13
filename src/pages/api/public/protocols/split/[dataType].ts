import { protocolsSplit } from '~/containers/ProtocolOverview/server/protocolSplit/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(protocolsSplit)
