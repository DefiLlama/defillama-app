import { toNextHandler } from '~/server/api/nextAdapter'
import { flareSupply } from '~/server/api/routes/flare'

export default toNextHandler(flareSupply)
