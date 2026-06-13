import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsLoopDataset } from '~/server/api/routes/yieldsDatasets'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(yieldsLoopDataset)
