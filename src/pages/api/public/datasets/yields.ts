import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsDataset } from '~/containers/Yields/server/api'

export default toNextHandler(yieldsDataset)
