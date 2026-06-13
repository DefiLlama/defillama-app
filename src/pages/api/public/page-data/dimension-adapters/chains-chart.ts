import { dimensionAdapterChainsChart } from '~/containers/AdapterMetrics/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(dimensionAdapterChainsChart)
