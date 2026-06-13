import { toNextHandler } from '~/server/api/nextAdapter'
import { tokenMarkets } from '~/containers/Token/server/api'

export default toNextHandler(tokenMarkets)
