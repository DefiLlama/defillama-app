import { toNextHandler } from '~/server/api/nextAdapter'
import { flareNetwork } from '~/server/api/routes/flare'

export default toNextHandler(flareNetwork)
