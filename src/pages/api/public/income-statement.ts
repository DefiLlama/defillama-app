import { incomeStatement } from '~/containers/ProtocolOverview/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(incomeStatement)
