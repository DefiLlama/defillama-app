import { toNextHandler } from '~/server/api/nextAdapter'
import { rwaPerpsOverviewBreakdown } from '~/server/api/routes/rwa'

export { parsePerpsOverviewBreakdownRequest as parseOverviewBreakdownRequest } from '~/server/api/routes/rwa'

export default toNextHandler(rwaPerpsOverviewBreakdown)
