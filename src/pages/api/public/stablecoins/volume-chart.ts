import { stablecoinVolumeChart } from '~/containers/Stablecoins/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(stablecoinVolumeChart)
