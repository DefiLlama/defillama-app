import { rwaOverviewBreakdown } from '~/containers/RWA/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export { parseRWAOverviewBreakdownRequest as parseOverviewBreakdownRequest } from '~/containers/RWA/server/api'

export default toNextHandler(rwaOverviewBreakdown)
