import { toNextHandler } from '~/server/api/nextAdapter'
import { bridgeTransactions } from '~/server/api/routes/bridges'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(bridgeTransactions)
