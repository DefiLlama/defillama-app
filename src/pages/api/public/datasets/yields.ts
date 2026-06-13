import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsDataset } from '~/server/api/routes/yieldsDatasets'

export default toNextHandler(yieldsDataset)
