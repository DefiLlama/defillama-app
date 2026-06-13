import { toNextHandler } from '~/server/api/nextAdapter'
import { bridgeTransactions } from '~/containers/Bridges/server/api'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(bridgeTransactions)
