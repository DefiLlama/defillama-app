import { chainsCharts } from '~/containers/ChainsByCategory/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(chainsCharts)
