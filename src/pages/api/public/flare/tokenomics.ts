import { toNextHandler } from '~/server/api/nextAdapter'
import { flareTokenomics } from '~/server/api/routes/flare'

export default toNextHandler(flareTokenomics)
