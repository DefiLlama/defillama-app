import { toNextHandler } from '~/server/api/nextAdapter'
import { flareOverview } from '~/server/api/routes/flare'

export default toNextHandler(flareOverview)
