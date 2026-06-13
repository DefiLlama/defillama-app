import { toNextHandler } from '~/server/api/nextAdapter'
import { stablecoinVolumeChart } from '~/containers/Stablecoins/server/api'

export default toNextHandler(stablecoinVolumeChart)
