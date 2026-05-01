export function getDatasetIndexFileName(key: string): string {
	return `${encodeURIComponent(key)}.json`
}

export function isFileNotFoundError(error: unknown): boolean {
	return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
