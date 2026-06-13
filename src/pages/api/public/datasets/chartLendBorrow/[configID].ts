import { toNextHandler } from '~/server/api/nextAdapter'
import { chartLendBorrowDataset } from '~/server/api/routes/publicDatasets'

export default toNextHandler(chartLendBorrowDataset)
