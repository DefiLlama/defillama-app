import { toNextHandler } from '~/server/api/nextAdapter'
import { flareMetadata } from '~/server/api/routes/flare'

export default toNextHandler(flareMetadata)
