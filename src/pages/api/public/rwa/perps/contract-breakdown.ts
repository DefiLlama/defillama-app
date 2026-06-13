import { toNextHandler } from '~/server/api/nextAdapter'
import { rwaPerpsContractBreakdown } from '~/containers/RWA/server/api'

export { parsePerpsContractBreakdownRequest as parseContractBreakdownRequest } from '~/containers/RWA/server/api'

export default toNextHandler(rwaPerpsContractBreakdown)
