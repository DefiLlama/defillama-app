import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsHalalDataset } from '~/containers/Yields/server/api'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(yieldsHalalDataset)
