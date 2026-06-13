import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsStrategyLongShortDataset } from '~/containers/Yields/server/api'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(yieldsStrategyLongShortDataset)
