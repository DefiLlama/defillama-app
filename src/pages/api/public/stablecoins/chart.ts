import { toNextHandler } from '~/server/api/nextAdapter'
import { stablecoinMcapChart } from '~/server/api/routes/stablecoins'

export default toNextHandler(stablecoinMcapChart)
