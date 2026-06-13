import { toNextHandler } from '~/server/api/nextAdapter'
import { protocolChainSplit } from '~/server/api/routes/protocolSplit'

export default toNextHandler(protocolChainSplit)
