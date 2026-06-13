import { toNextHandler } from '~/server/api/nextAdapter'
import { categoriesCharts } from '~/containers/ProtocolTaxonomy/server/api'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(categoriesCharts)
