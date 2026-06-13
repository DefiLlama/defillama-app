import { chainCache } from '~/containers/CompareChains/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

const handler = toNextHandler(chainCache)

/** Named export kept for route-metadata-guards.test.ts. */
export const chainCacheHandler = handler

export default handler
