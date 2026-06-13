import { toNextHandler } from '~/server/api/nextAdapter'
import { holdersByConfigDataset } from '~/containers/Yields/server/api'

export default toNextHandler(holdersByConfigDataset)
