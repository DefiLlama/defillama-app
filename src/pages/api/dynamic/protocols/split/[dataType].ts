import { toNextHandler } from '~/server/api/nextAdapter'
import { protocolsSplit } from '~/server/api/routes/protocolSplit'

export default toNextHandler(protocolsSplit)
