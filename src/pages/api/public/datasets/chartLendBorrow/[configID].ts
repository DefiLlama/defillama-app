import { toNextHandler } from '~/server/api/nextAdapter'
import { chartLendBorrowDataset } from '~/containers/Yields/server/api'

export default toNextHandler(chartLendBorrowDataset)
