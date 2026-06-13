import { toNextHandler } from '~/server/api/nextAdapter'
import { flareStaking } from '~/server/api/routes/flare'

export default toNextHandler(flareStaking)
