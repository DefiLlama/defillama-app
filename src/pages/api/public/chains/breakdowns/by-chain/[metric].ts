import { chainNativeByChainBreakdown } from '~/containers/ChainOverview/server/breakdowns'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(chainNativeByChainBreakdown)
