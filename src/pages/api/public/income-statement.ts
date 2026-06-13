import { toNextHandler } from '~/server/api/nextAdapter'
import { incomeStatement } from '~/containers/ProtocolOverview/server/api'

export default toNextHandler(incomeStatement)
