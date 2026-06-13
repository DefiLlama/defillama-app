import { toNextHandler } from '~/server/api/nextAdapter'
import { categoriesCharts } from '~/server/api/routes/pageData'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(categoriesCharts)
