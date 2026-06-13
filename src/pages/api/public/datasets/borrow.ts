import { toNextHandler } from '~/server/api/nextAdapter'
import { borrowDataset } from '~/server/api/routes/publicDatasets'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(borrowDataset)
