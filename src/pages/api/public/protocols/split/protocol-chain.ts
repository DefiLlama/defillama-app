import { protocolChainSplit } from '~/containers/ProtocolOverview/server/protocolSplit/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(protocolChainSplit)
