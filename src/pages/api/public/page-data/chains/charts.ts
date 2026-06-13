import { toNextHandler } from '~/server/api/nextAdapter'
import { chainsCharts } from '~/server/api/routes/pageData'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(chainsCharts)
