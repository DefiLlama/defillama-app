import { toNextHandler } from '~/server/api/nextAdapter'
import { incomeStatement } from '~/server/api/routes/incomeStatement'

export default toNextHandler(incomeStatement)
