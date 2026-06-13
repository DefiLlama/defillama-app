import { toNextHandler } from '~/server/api/nextAdapter'
import { rwaOverviewBreakdown } from '~/containers/RWA/server/api'

export { parseRWAOverviewBreakdownRequest as parseOverviewBreakdownRequest } from '~/containers/RWA/server/api'

export default toNextHandler(rwaOverviewBreakdown)
