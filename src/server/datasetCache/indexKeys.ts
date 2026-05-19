import { createHash } from 'node:crypto'

const DATASET_INDEX_FILE_EXTENSION = '.json'
const MAX_DATASET_INDEX_FILE_NAME_BYTES = 240

// encodeURIComponent leaves through `!~*'()` which is fine for URLs but `*` is
// reserved on Windows (alongside <>:"/\|?). Escape them too so shard filenames
// are portable across platforms.
function encodeForFilename(key: string): string {
	return encodeURIComponent(key).replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

export function getDatasetIndexFileName(key: string): string {
	const encodedName = `${encodeForFilename(key)}${DATASET_INDEX_FILE_EXTENSION}`
	if (Buffer.byteLength(encodedName) <= MAX_DATASET_INDEX_FILE_NAME_BYTES) {
		return encodedName
	}

	return `${createHash('sha256').update(key).digest('hex')}${DATASET_INDEX_FILE_EXTENSION}`
}
