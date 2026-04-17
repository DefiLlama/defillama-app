import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface DuckDBHandle {
	db: AsyncDuckDB
	conn: AsyncDuckDBConnection
}

let dbPromise: Promise<DuckDBHandle> | null = null

export function getDuckDB(): Promise<DuckDBHandle> {
	if (!dbPromise) {
		dbPromise = loadDuckDB().catch((err) => {
			// Reset on failure so retrying the switch tries again fresh.
			dbPromise = null
			throw err
		})
	}
	return dbPromise
}

async function loadDuckDB(): Promise<DuckDBHandle> {
	const duckdb = await import('@duckdb/duckdb-wasm')
	const bundles = duckdb.getJsDelivrBundles()
	const bundle = await duckdb.selectBundle(bundles)

	// Bootstrap the worker by loading its JS from the CDN via importScripts.
	// This sidesteps bundler-specific worker loading and keeps simple-mode users
	// off the hook for DuckDB's module graph.
	const workerSrc = `importScripts("${bundle.mainWorker!}");`
	const blobUrl = URL.createObjectURL(new Blob([workerSrc], { type: 'application/javascript' }))
	const worker = new Worker(blobUrl)

	const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING)
	const db = new duckdb.AsyncDuckDB(logger, worker)
	await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
	URL.revokeObjectURL(blobUrl)

	const conn = await db.connect()
	return { db, conn }
}
