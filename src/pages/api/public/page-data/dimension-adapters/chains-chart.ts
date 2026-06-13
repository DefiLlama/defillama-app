import { toNextHandler } from '~/server/api/nextAdapter'
import { dimensionAdapterChainsChart } from '~/containers/AdapterMetrics/server/api'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(dimensionAdapterChainsChart)
