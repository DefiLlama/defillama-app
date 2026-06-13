import { rwaAssetBreakdown } from '~/containers/RWA/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export {
	buildAssetBreakdownUrl,
	normalizeAssetBreakdownRows,
	parseAssetBreakdownRequest
} from '~/containers/RWA/server/api'

export default toNextHandler(rwaAssetBreakdown)
