import { bridgeTransactions } from '~/containers/Bridges/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(bridgeTransactions)
