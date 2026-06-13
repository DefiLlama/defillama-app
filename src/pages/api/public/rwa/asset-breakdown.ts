import { toNextHandler } from '~/server/api/nextAdapter'
import { rwaAssetBreakdown } from '~/containers/RWA/server/api'

export { buildAssetBreakdownUrl, normalizeAssetBreakdownRows, parseAssetBreakdownRequest } from '~/containers/RWA/server/api'

export default toNextHandler(rwaAssetBreakdown)
