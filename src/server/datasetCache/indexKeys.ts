import { createHash } from 'node:crypto'

const DATASET_INDEX_FILE_EXTENSION = '.json'
const MAX_DATASET_INDEX_FILE_NAME_BYTES = 240
const PORTABLE_FILENAME_FORBIDDEN_CHARS = /[<>:"/\\|?*]/
const WINDOWS_RESERVED_DEVICE_NAMES = new Set([
	'con',
	'prn',
	'aux',
	'nul',
	'com1',
	'com2',
	'com3',
	'com4',
	'com5',
	'com6',
	'com7',
	'com8',
	'com9',
	'lpt1',
	'lpt2',
	'lpt3',
	'lpt4',
	'lpt5',
	'lpt6',
	'lpt7',
	'lpt8',
	'lpt9'
])

function getHashedFileName(key: string): string {
	return `${createHash('sha256').update(key).digest('hex')}${DATASET_INDEX_FILE_EXTENSION}`
}

// encodeURIComponent leaves through `!~*'()`; escape those so readable shard
// names only use characters that are valid in filenames across Windows/macOS/Linux.
function encodeForFilename(key: string): string {
	return encodeURIComponent(key).replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function hasWindowsReservedDeviceName(fileName: string): boolean {
	const baseName = fileName.slice(0, -DATASET_INDEX_FILE_EXTENSION.length)
	const deviceName = baseName.split('.', 1)[0].toLowerCase()
	return WINDOWS_RESERVED_DEVICE_NAMES.has(deviceName)
}

function hasControlChar(fileName: string): boolean {
	for (let i = 0; i < fileName.length; i++) {
		if (fileName.charCodeAt(i) < 32) return true
	}
	return false
}

function isPortableReadableFilename(fileName: string): boolean {
	return (
		Buffer.byteLength(fileName) <= MAX_DATASET_INDEX_FILE_NAME_BYTES &&
		!PORTABLE_FILENAME_FORBIDDEN_CHARS.test(fileName) &&
		!hasControlChar(fileName) &&
		!fileName.endsWith(' ') &&
		!fileName.endsWith('.') &&
		!hasWindowsReservedDeviceName(fileName)
	)
}

export function getDatasetIndexFileName(key: string): string {
	const encodedName = `${encodeForFilename(key)}${DATASET_INDEX_FILE_EXTENSION}`
	if (isPortableReadableFilename(encodedName)) {
		return encodedName
	}

	return getHashedFileName(key)
}
