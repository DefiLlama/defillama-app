import { borrowDataset } from '~/containers/Yields/server/api'
import { toNextHandler } from '~/server/api/nextAdapter'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(borrowDataset)
