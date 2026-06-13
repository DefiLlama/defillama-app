import { toNextHandler } from '~/server/api/nextAdapter'
import { exchangeMarkets } from '~/server/api/routes/markets'

export default toNextHandler(exchangeMarkets)
