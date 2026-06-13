import { rwaPerpsContractBreakdown } from '~/containers/RWA/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export { parsePerpsContractBreakdownRequest as parseContractBreakdownRequest } from '~/containers/RWA/server/api'

export default toNextHandler(rwaPerpsContractBreakdown)
