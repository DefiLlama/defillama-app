export function isDatasetCacheEnabled(): boolean {
	return process.env.NODE_ENV !== 'test' && process.env.DATASET_CACHE_DISABLE !== '1'
}
