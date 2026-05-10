import { createHash } from 'node:crypto'

const DATASET_INDEX_FILE_EXTENSION = '.json'
const MAX_DATASET_INDEX_FILE_NAME_BYTES = 240

export function getDatasetIndexFileName(key: string): string {
	const encodedName = `${encodeURIComponent(key)}${DATASET_INDEX_FILE_EXTENSION}`
	if (Buffer.byteLength(encodedName) <= MAX_DATASET_INDEX_FILE_NAME_BYTES) {
		return encodedName
	}

	return `${createHash('sha256').update(key).digest('hex')}${DATASET_INDEX_FILE_EXTENSION}`
}
