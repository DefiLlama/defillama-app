import { tokenMarkets } from '~/containers/Token/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(tokenMarkets)
