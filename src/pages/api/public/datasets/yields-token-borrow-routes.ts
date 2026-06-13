import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsTokenBorrowRoutes } from '~/containers/Yields/server/api'

export default toNextHandler(yieldsTokenBorrowRoutes)
