import { toNextHandler } from '~/server/api/nextAdapter'
import { stablecoinMcapChart } from '~/containers/Stablecoins/server/api'

export default toNextHandler(stablecoinMcapChart)
