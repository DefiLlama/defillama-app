import { toNextHandler } from '~/server/api/nextAdapter'
import { stablecoinVolumeChart } from '~/server/api/routes/stablecoins'

export default toNextHandler(stablecoinVolumeChart)
