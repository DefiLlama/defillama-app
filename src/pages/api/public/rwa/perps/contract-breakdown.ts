import { toNextHandler } from '~/server/api/nextAdapter'
import { rwaPerpsContractBreakdown } from '~/server/api/routes/rwa'

export { parsePerpsContractBreakdownRequest as parseContractBreakdownRequest } from '~/server/api/routes/rwa'

export default toNextHandler(rwaPerpsContractBreakdown)
