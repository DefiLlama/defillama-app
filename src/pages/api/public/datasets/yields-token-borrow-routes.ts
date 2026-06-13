import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsTokenBorrowRoutes } from '~/server/api/routes/yieldsDatasets'

export default toNextHandler(yieldsTokenBorrowRoutes)
