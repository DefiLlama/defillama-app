import { toNextHandler } from '~/server/api/nextAdapter'
import { rwaPerpsOverviewBreakdown } from '~/containers/RWA/server/api'

export { parsePerpsOverviewBreakdownRequest as parseOverviewBreakdownRequest } from '~/containers/RWA/server/api'

export default toNextHandler(rwaPerpsOverviewBreakdown)
