import { holdersByConfigDataset } from '~/containers/Yields/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export default toNextHandler(holdersByConfigDataset)
