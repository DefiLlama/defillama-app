import { stablecoinByChainBreakdown } from '~/containers/Stablecoins/server/breakdowns'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(stablecoinByChainBreakdown)
