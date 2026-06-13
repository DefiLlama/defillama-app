import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsHalalDataset } from '~/server/api/routes/yieldsDatasets'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(yieldsHalalDataset)
