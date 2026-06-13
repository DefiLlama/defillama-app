import { toNextHandler } from '~/server/api/nextAdapter'
import { exchangeMarkets } from '~/containers/Cexs/server/api'

export default toNextHandler(exchangeMarkets)
