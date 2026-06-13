import { toNextHandler } from '~/server/api/nextAdapter'
import { tokenMarkets } from '~/server/api/routes/markets'

export default toNextHandler(tokenMarkets)
