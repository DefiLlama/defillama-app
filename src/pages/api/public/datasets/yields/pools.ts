import { toNextHandler } from '~/server/api/nextAdapter'
import { yieldsPoolsDataset } from '~/containers/Yields/server/api'

export const config = {
	api: {
		responseLimit: false
	}
}

export default toNextHandler(yieldsPoolsDataset)
