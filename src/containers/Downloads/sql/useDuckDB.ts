import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { useEffect, useState } from 'react'
import { getDuckDB } from './duckdb'

export type DuckDBStatus = 'loading' | 'ready' | 'error'

export interface UseDuckDBResult {
	db: AsyncDuckDB | null
	conn: AsyncDuckDBConnection | null
	status: DuckDBStatus
	error: string | null
}

export function useDuckDB(): UseDuckDBResult {
	const [db, setDb] = useState<AsyncDuckDB | null>(null)
	const [conn, setConn] = useState<AsyncDuckDBConnection | null>(null)
	const [status, setStatus] = useState<DuckDBStatus>('loading')
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		getDuckDB()
			.then((handle) => {
				if (cancelled) return
				setDb(handle.db)
				setConn(handle.conn)
				setStatus('ready')
			})
			.catch((err: unknown) => {
				if (cancelled) return
				setStatus('error')
				setError(err instanceof Error ? err.message : String(err))
			})
		return () => {
			cancelled = true
		}
	}, [])

	return { db, conn, status, error }
}
