import { toNextHandler } from '~/server/api/nextAdapter'
import { rwaAssetBreakdown } from '~/server/api/routes/rwa'

export { buildAssetBreakdownUrl, normalizeAssetBreakdownRows, parseAssetBreakdownRequest } from '~/server/api/routes/rwa'

export default toNextHandler(rwaAssetBreakdown)
