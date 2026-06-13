import { toNextHandler } from '~/server/api/nextAdapter'
import { holdersDataset } from '~/server/api/routes/publicDatasets'

export default toNextHandler(holdersDataset)
