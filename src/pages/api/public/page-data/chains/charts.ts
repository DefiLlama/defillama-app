import { toNextHandler } from '~/server/api/nextAdapter'
import { chainsCharts } from '~/containers/ChainsByCategory/server/api'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(chainsCharts)
