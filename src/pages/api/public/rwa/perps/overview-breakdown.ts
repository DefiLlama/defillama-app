import { rwaPerpsOverviewBreakdown } from '~/containers/RWA/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export { parsePerpsOverviewBreakdownRequest as parseOverviewBreakdownRequest } from '~/containers/RWA/server/api'

export default toNextHandler(rwaPerpsOverviewBreakdown)
