import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsStrategyLongShortDataset } from '~/server/api/routes/yieldsDatasets'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(yieldsStrategyLongShortDataset)
