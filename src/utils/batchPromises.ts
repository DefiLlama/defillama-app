export async function runBatchPromises<TBatch, TResult>(
	batches: Array<TBatch>,
	processBatch: (batch: TBatch) => Promise<TResult>,
	handleBatchError: (batch: TBatch, error: unknown) => TResult | Promise<TResult>
): Promise<Array<TResult>> {
	const batchPromises = batches.map(async (batch) => {
		try {
			return await processBatch(batch)
		} catch (error) {
			return handleBatchError(batch, error)
		}
	})

	return Promise.all(batchPromises)
}
