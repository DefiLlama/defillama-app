import { toNextHandler } from '~/server/api/nextAdapter'
import { rwaOverviewBreakdown } from '~/server/api/routes/rwa'

export { parseRWAOverviewBreakdownRequest as parseOverviewBreakdownRequest } from '~/server/api/routes/rwa'

export default toNextHandler(rwaOverviewBreakdown)
