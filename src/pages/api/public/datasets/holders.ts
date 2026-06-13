import { toNextHandler } from '~/server/api/nextAdapter'
import { holdersDataset } from '~/containers/Yields/server/api'

export default toNextHandler(holdersDataset)
