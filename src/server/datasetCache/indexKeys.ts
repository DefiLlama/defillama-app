import { createHash } from 'node:crypto'

const DATASET_INDEX_FILE_EXTENSION = '.json'
const MAX_DATASET_INDEX_FILE_NAME_BYTES = 240
const WINDOWS_RESERVED_BASENAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i

// encodeURIComponent leaves through `!~*'()` which is fine for URLs but `*` is
// reserved on Windows (alongside <>:"/\|?). Escape them too so shard filenames
// are portable across platforms.
function encodeForFilename(key: string): string {
	return encodeURIComponent(key).replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function canUseReadableFilename(encodedName: string): boolean {
	return (
		Buffer.byteLength(encodedName) <= MAX_DATASET_INDEX_FILE_NAME_BYTES &&
		!WINDOWS_RESERVED_BASENAMES.test(encodedName.slice(0, -DATASET_INDEX_FILE_EXTENSION.length))
	)
}

export function getDatasetIndexFileName(key: string): string {
	const encodedName = `${encodeForFilename(key)}${DATASET_INDEX_FILE_EXTENSION}`
	if (canUseReadableFilename(encodedName)) {
		return encodedName
	}

	return `${createHash('sha256').update(key).digest('hex')}${DATASET_INDEX_FILE_EXTENSION}`
}
