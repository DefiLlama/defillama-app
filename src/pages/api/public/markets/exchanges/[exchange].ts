import { exchangeMarkets } from '~/containers/Cexs/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(exchangeMarkets)
