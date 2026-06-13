import { toNextHandler } from '~/server/api/nextAdapter'
import { holdersByConfigDataset } from '~/server/api/routes/publicDatasets'

export default toNextHandler(holdersByConfigDataset)
