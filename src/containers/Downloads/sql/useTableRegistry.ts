import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { useCallback, useState } from 'react'
import { slug as toSlug } from '~/utils'
import { chartDatasetsBySlug } from '../chart-datasets'
import { datasetsBySlug } from '../datasets'

export type TableSource =
	| { kind: 'dataset'; slug: string }
	| { kind: 'chart'; slug: string; param: string; paramLabel?: string }

export interface RegisteredTable {
	name: string
	source: TableSource
	columns: Array<{ name: string; type?: string }>
	rowCount: number
	loadedAt: number
}

type AuthorizedFetch = (
	url: string,
	options?: RequestInit & { skipAuth?: boolean },
	onlyToken?: boolean
) => Promise<Response | null>

interface UseTableRegistryOptions {
	conn: AsyncDuckDBConnection | null
	authorizedFetch: AuthorizedFetch
}

// Sanitize a source into a valid LlamaSQL identifier.
// Table names must be quoted in queries when they contain non-identifier chars,
// but we prefer to give them identifier-safe names up front.
export function tableNameFor(source: TableSource): string {
	if (source.kind === 'dataset') return identifierize(source.slug)
	return `ts_${identifierize(source.slug)}_${identifierize(source.param)}`
}

export function identifierize(s: string): string {
	const normalized = s
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/^_+|_+$/g, '')
	return /^[a-z]/.test(normalized) ? normalized : `t_${normalized}`
}

export function useTableRegistry({ conn, authorizedFetch }: UseTableRegistryOptions) {
	const [tables, setTables] = useState<RegisteredTable[]>([])
	const [loading, setLoading] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(
		async (source: TableSource, signal?: AbortSignal): Promise<RegisteredTable | null> => {
			if (!conn) return null
			const name = tableNameFor(source)
			setLoading(name)
			setError(null)
			try {
				throwIfAborted(signal)
				const { csvText, columns } = await fetchCsvFor(source, authorizedFetch, signal)
				throwIfAborted(signal)
				const fileName = `${name}.csv`
				const db = conn.bindings
				if (db && typeof db.registerFileText === 'function') {
					await withAbort(Promise.resolve(db.registerFileText(fileName, csvText)), signal)
				} else {
					await registerViaBuffer(conn, fileName, csvText, signal)
				}
				throwIfAborted(signal)
				await withAbort(
					conn.query(
						`CREATE OR REPLACE TABLE "${name}" AS SELECT * FROM read_csv_auto('${fileName}', header = true, sample_size = -1)`
					),
					signal,
					() => conn.cancelSent().catch(() => undefined)
				)
				throwIfAborted(signal)
				const countResult = await withAbort(conn.query(`SELECT COUNT(*)::BIGINT AS n FROM "${name}"`), signal, () =>
					conn.cancelSent().catch(() => undefined)
				)
				const countRow = countResult.toArray()[0] as { n: bigint | number } | undefined
				const rowCount = countRow ? Number(countRow.n) : 0

				throwIfAborted(signal)
				const typeByColumn = await describeTypes(conn, name, signal)
				throwIfAborted(signal)
				const entry: RegisteredTable = {
					name,
					source,
					columns: columns.map((c) => ({ name: c, type: typeByColumn.get(c) })),
					rowCount,
					loadedAt: Date.now()
				}
				setTables((prev) => {
					const without = prev.filter((t) => t.name !== name)
					return [...without, entry]
				})
				return entry
			} catch (err) {
				if (isAbortError(err) || signal?.aborted) return null
				setError(err instanceof Error ? err.message : String(err))
				return null
			} finally {
				setLoading(null)
			}
		},
		[conn, authorizedFetch]
	)

	const remove = useCallback(
		async (name: string) => {
			if (!conn) return
			try {
				await conn.query(`DROP TABLE IF EXISTS "${name}"`)
			} catch (err) {
				console.error(`Failed to drop table ${name}:`, err)
			}
			setTables((prev) => prev.filter((t) => t.name !== name))
		},
		[conn]
	)

	return { tables, loading, error, load, remove }
}

async function describeTypes(
	conn: AsyncDuckDBConnection,
	name: string,
	signal?: AbortSignal
): Promise<Map<string, string>> {
	try {
		const described = await withAbort(conn.query(`DESCRIBE "${name}"`), signal, () =>
			conn.cancelSent().catch(() => undefined)
		)
		const map = new Map<string, string>()
		for (const row of described.toArray() as Array<{ column_name: string; column_type: string }>) {
			if (row?.column_name) map.set(row.column_name, row.column_type)
		}
		return map
	} catch {
		return new Map()
	}
}

async function registerViaBuffer(
	conn: AsyncDuckDBConnection,
	fileName: string,
	text: string,
	signal?: AbortSignal
): Promise<void> {
	const enc = new TextEncoder().encode(text)
	const db = conn.bindings
	if (db && typeof db.registerFileBuffer === 'function') {
		await withAbort(Promise.resolve(db.registerFileBuffer(fileName, enc)), signal)
		return
	}
	throw new Error('Unable to register CSV buffer with LlamaSQL instance')
}

async function fetchCsvFor(
	source: TableSource,
	authorizedFetch: AuthorizedFetch,
	signal?: AbortSignal
): Promise<{ csvText: string; columns: string[] }> {
	const url =
		source.kind === 'dataset'
			? `/api/downloads/${encodeURIComponent(source.slug)}`
			: `/api/downloads/chart/${encodeURIComponent(source.slug)}?param=${encodeURIComponent(source.param)}`

	throwIfAborted(signal)
	const resp = await authorizedFetch(url, signal ? { signal } : undefined)
	throwIfAborted(signal)
	if (!resp) throw new Error('Not authenticated')
	if (!resp.ok) {
		const body = await safeJson(resp)
		throw new Error(
			body?.error ??
				`Failed to load ${source.kind === 'dataset' ? source.slug : `${source.slug}/${source.param}`}: HTTP ${resp.status}`
		)
	}
	const csvText = await withAbort(resp.text(), signal)
	throwIfAborted(signal)
	const columns = inferColumns(source, csvText)
	return { csvText, columns }
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
}

function isAbortError(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError'
}

async function withAbort<T>(promise: Promise<T>, signal?: AbortSignal, onAbort?: () => void): Promise<T> {
	if (!signal) return promise
	throwIfAborted(signal)
	return await new Promise<T>((resolve, reject) => {
		const onSignalAbort = () => {
			onAbort?.()
			reject(new DOMException('Cancelled', 'AbortError'))
		}
		signal.addEventListener('abort', onSignalAbort, { once: true })
		promise.then(
			(value) => {
				signal.removeEventListener('abort', onSignalAbort)
				resolve(value)
			},
			(err) => {
				signal.removeEventListener('abort', onSignalAbort)
				reject(err)
			}
		)
	})
}

async function safeJson(resp: Response): Promise<any> {
	try {
		return await resp.json()
	} catch {
		return null
	}
}

function inferColumns(source: TableSource, csvText: string): string[] {
	// Prefer the curated `fields` array when available — matches what the CSV endpoint emitted
	// and preserves the intended column order.
	if (source.kind === 'dataset') {
		const def = datasetsBySlug.get(source.slug)
		if (def?.fields && def.fields.length > 0) return [...def.fields]
	}
	// Fallback: parse the first line.
	const firstLine = csvText.split('\n', 1)[0] ?? ''
	if (!firstLine) return []
	return parseCsvHeader(firstLine)
}

function parseCsvHeader(line: string): string[] {
	const fields: string[] = []
	let i = 0
	while (i < line.length) {
		if (line[i] === '"') {
			i++
			let field = ''
			while (i < line.length) {
				if (line[i] === '"' && line[i + 1] === '"') {
					field += '"'
					i += 2
				} else if (line[i] === '"') {
					i++
					break
				} else {
					field += line[i]
					i++
				}
			}
			fields.push(field)
			if (i < line.length && line[i] === ',') i++
		} else {
			let field = ''
			while (i < line.length && line[i] !== ',') {
				field += line[i]
				i++
			}
			fields.push(field)
			if (i < line.length && line[i] === ',') i++
			else break
		}
	}
	return fields
}

export function prettyLabelForSource(source: TableSource): string {
	if (source.kind === 'dataset') {
		return datasetsBySlug.get(source.slug)?.name ?? source.slug
	}
	const def = chartDatasetsBySlug.get(source.slug)
	const label = source.paramLabel ?? source.param
	if (def) return `${def.name} · ${label}`
	return `${source.slug} · ${label}`
}

export { toSlug }
