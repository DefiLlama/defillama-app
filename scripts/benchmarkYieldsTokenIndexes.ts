import { promises as fs } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

type YieldRow = {
	configID?: string
	id?: string
	pool?: string
	[key: string]: unknown
}

const FIXED_TOKENS = ['eth', 'weth', 'usdc', 'btc', 'aave']
const MISSING_TOKEN = '__missing_yield_token__'

function getDatasetRootDir(): string {
	return path.resolve(process.cwd(), process.env.DATASET_CACHE_DIR ?? '.cache/datasets')
}

function getDatasetIndexFileName(key: string): string {
	const encodedName = `${encodeURIComponent(key)}.json`
	if (Buffer.byteLength(encodedName) <= 240) {
		return encodedName
	}
	throw new Error(`Benchmark token ${key} is too long for the local index filename helper`)
}

async function readJsonFile<T>(filePath: string): Promise<T> {
	return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath)
		return true
	} catch {
		return false
	}
}

function getRowId(row: YieldRow): string {
	return String(row.configID ?? row.id ?? row.pool ?? '')
}

function isYieldRow(value: unknown): value is YieldRow {
	return typeof value === 'object' && value !== null
}

function dedupeRows(rows: YieldRow[]): YieldRow[] {
	const byId = new Map<string, YieldRow>()
	for (const row of rows) {
		byId.set(getRowId(row), row)
	}
	return [...byId.values()]
}

function fallbackFilterRows(rows: YieldRow[], token: string): YieldRow[] {
	const normalized = token.toLowerCase()
	return rows.filter((row) =>
		String(row.pool ?? '')
			.toLowerCase()
			.includes(normalized)
	)
}

async function chooseSmallToken(byTokenDir: string): Promise<string> {
	for (const fileName of await fs.readdir(byTokenDir)) {
		if (!fileName.endsWith('.json')) continue
		const filePath = path.join(byTokenDir, fileName)
		const stat = await fs.stat(filePath)
		const token = decodeURIComponent(fileName.slice(0, -'.json'.length))
		if (stat.size <= 4096 && !FIXED_TOKENS.includes(token)) {
			return token
		}
	}
	return FIXED_TOKENS[FIXED_TOKENS.length - 1]
}

async function measure<T>(fn: () => Promise<T>): Promise<{ value: T; durationMs: number }> {
	const start = performance.now()
	const value = await fn()
	return { value, durationMs: performance.now() - start }
}

function percentile(values: number[], percentileValue: number): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const index = Math.min(sorted.length - 1, Math.ceil(percentileValue * sorted.length) - 1)
	return sorted[index]
}

async function collectIndexSizeEstimate(
	byTokenDir: string,
	rowById: Map<string, YieldRow>
): Promise<{
	actualBytes: number
	fullRowBytes: number
	referenceBytes: number
	fileCount: number
	fullRowFileCount: number
	referenceFileCount: number
}> {
	let actualBytes = 0
	let fullRowBytes = 0
	let referenceBytes = 0
	let fileCount = 0
	let fullRowFileCount = 0
	let referenceFileCount = 0

	for (const fileName of await fs.readdir(byTokenDir)) {
		if (!fileName.endsWith('.json')) continue
		fileCount++
		const filePath = path.join(byTokenDir, fileName)
		const file = await fs.readFile(filePath, 'utf8')
		actualBytes += Buffer.byteLength(file)
		const entries = JSON.parse(file) as Array<YieldRow | string>
		if (entries.some(isYieldRow)) {
			fullRowFileCount++
		} else {
			referenceFileCount++
		}
		const rows = entries
			.map((entry) => (isYieldRow(entry) ? entry : rowById.get(entry)))
			.filter((row): row is YieldRow => Boolean(row))
		const rowIds = rows.map(getRowId).filter(Boolean)
		fullRowBytes += Buffer.byteLength(JSON.stringify(rows))
		referenceBytes += Buffer.byteLength(JSON.stringify(rowIds))
	}

	return { actualBytes, fullRowBytes, referenceBytes, fileCount, fullRowFileCount, referenceFileCount }
}

async function readIndexAsRows(filePath: string, rowById: Map<string, YieldRow>): Promise<YieldRow[]> {
	const entries = await readJsonFile<Array<YieldRow | string>>(filePath)
	return entries
		.map((entry) => (isYieldRow(entry) ? entry : rowById.get(entry)))
		.filter((row): row is YieldRow => Boolean(row))
}

async function main() {
	const datasetRoot = getDatasetRootDir()
	const yieldsDir = path.join(datasetRoot, 'yields')
	const byTokenDir = path.join(yieldsDir, 'by-token')
	const rowsPath = path.join(yieldsDir, 'rows.json')

	if (!(await pathExists(rowsPath)) || !(await pathExists(byTokenDir))) {
		throw new Error(`Expected generated yields dataset under ${yieldsDir}`)
	}

	const smallToken = await chooseSmallToken(byTokenDir)
	const tokens = [...FIXED_TOKENS, smallToken, MISSING_TOKEN]
	const rowsJsonBytes = (await fs.stat(rowsPath)).size
	const rows = await readJsonFile<YieldRow[]>(rowsPath)
	const rowById = new Map(rows.map((row) => [getRowId(row), row] as const).filter(([id]) => Boolean(id)))
	const sizeEstimate = await collectIndexSizeEstimate(byTokenDir, rowById)
	const referenceIndexJsonByToken = new Map<string, string>()
	const fullRowIndexJsonByToken = new Map<string, string>()

	for (const token of tokens) {
		const filePath = path.join(byTokenDir, getDatasetIndexFileName(token))
		if (!(await pathExists(filePath))) {
			referenceIndexJsonByToken.set(token, '[]')
			fullRowIndexJsonByToken.set(token, '[]')
			continue
		}
		const tokenRows = await readIndexAsRows(filePath, rowById)
		const rowIds = tokenRows.map(getRowId).filter(Boolean)
		referenceIndexJsonByToken.set(token, JSON.stringify(rowIds))
		fullRowIndexJsonByToken.set(token, JSON.stringify(tokenRows))
	}

	const fullRowCold = []
	for (const token of tokens) {
		const { value, durationMs } = await measure(async () => {
			const filePath = path.join(byTokenDir, getDatasetIndexFileName(token))
			if (await pathExists(filePath)) {
				return dedupeRows(JSON.parse(fullRowIndexJsonByToken.get(token) ?? '[]') as YieldRow[])
			}
			return fallbackFilterRows(await readJsonFile<YieldRow[]>(rowsPath), token)
		})
		fullRowCold.push({ token, durationMs, rows: value.length })
	}

	const fullRowWarmCache = new Map<string, YieldRow[]>()
	const referenceWarmCache = new Map<string, string[]>()
	for (const token of tokens) {
		const filePath = path.join(byTokenDir, getDatasetIndexFileName(token))
		if (await pathExists(filePath)) {
			fullRowWarmCache.set(token, dedupeRows(await readIndexAsRows(filePath, rowById)))
		}
		referenceWarmCache.set(token, JSON.parse(referenceIndexJsonByToken.get(token) ?? '[]') as string[])
	}

	const referenceCold = []
	for (const token of tokens) {
		const { value, durationMs } = await measure(async () => {
			const coldRows = await readJsonFile<YieldRow[]>(rowsPath)
			const coldRowById = new Map(coldRows.map((row) => [getRowId(row), row] as const).filter(([id]) => Boolean(id)))
			const ids = JSON.parse(referenceIndexJsonByToken.get(token) ?? '[]') as string[]
			if (ids.length === 0) return fallbackFilterRows(coldRows, token)
			return ids.map((id) => coldRowById.get(id)).filter((row): row is YieldRow => Boolean(row))
		})
		referenceCold.push({ token, durationMs, rows: value.length })
	}

	const fullRowWarmDurations: number[] = []
	const referenceWarmDurations: number[] = []
	for (let iteration = 0; iteration < 50; iteration++) {
		for (const token of tokens) {
			fullRowWarmDurations.push(
				(await measure(async () => fullRowWarmCache.get(token) ?? fallbackFilterRows(rows, token))).durationMs
			)
			referenceWarmDurations.push(
				(
					await measure(async () => {
						const ids = referenceWarmCache.get(token) ?? []
						if (ids.length === 0) return fallbackFilterRows(rows, token)
						return ids.map((id) => rowById.get(id)).filter((row): row is YieldRow => Boolean(row))
					})
				).durationMs
			)
		}
	}

	const referenceSizeReductionPct =
		sizeEstimate.fullRowBytes === 0
			? 0
			: ((sizeEstimate.fullRowBytes - sizeEstimate.referenceBytes) / sizeEstimate.fullRowBytes) * 100
	const fullRowWarmP95 = percentile(fullRowWarmDurations, 0.95)
	const referenceWarmP95 = percentile(referenceWarmDurations, 0.95)
	const switchToReferenceIndexes = referenceSizeReductionPct >= 70 && referenceWarmP95 <= fullRowWarmP95 + 10

	console.log(
		JSON.stringify(
			{
				datasetRoot,
				tokens,
				artifact: {
					rowsJsonBytes,
					byTokenFileCount: sizeEstimate.fileCount,
					actualByTokenBytes: sizeEstimate.actualBytes,
					estimatedFullRowByTokenBytes: sizeEstimate.fullRowBytes,
					estimatedReferenceByTokenBytes: sizeEstimate.referenceBytes,
					estimatedReferenceSizeReductionPct: Number(referenceSizeReductionPct.toFixed(2)),
					detectedIndexFormat:
						sizeEstimate.referenceFileCount === sizeEstimate.fileCount
							? 'reference'
							: sizeEstimate.fullRowFileCount === sizeEstimate.fileCount
								? 'full-row'
								: 'mixed',
					fullRowFileCount: sizeEstimate.fullRowFileCount,
					referenceFileCount: sizeEstimate.referenceFileCount
				},
				latencyMs: {
					fullRowCold,
					referenceCold,
					fullRowWarmP95: Number(fullRowWarmP95.toFixed(3)),
					referenceWarmP95: Number(referenceWarmP95.toFixed(3)),
					referenceWarmWithinDecisionBudget: referenceWarmP95 <= fullRowWarmP95 + 10
				},
				memoryImplications: {
					referenceStrategyRequiresRowsJsonMap: true,
					rowCount: rows.length,
					poolIdMapEntries: rowById.size,
					fullRowWarmSelectedTokenRows: Array.from(fullRowWarmCache.values()).reduce(
						(sum, value) => sum + value.length,
						0
					)
				},
				decisionRule: {
					switchToReferenceIndexes,
					reason: switchToReferenceIndexes
						? 'reference indexes meet the configured size and warm-latency thresholds'
						: 'keep full-row indexes unless both size and warm-latency thresholds are met'
				},
				nextStep: switchToReferenceIndexes
					? 'regenerate .cache/datasets so yields/by-token files contain row ids instead of full rows'
					: 'keep the current full-row yields/by-token artifact'
			},
			null,
			2
		)
	)
}

main().catch((error) => {
	console.error('[benchmarkYieldsTokenIndexes] Failed', error)
	process.exit(1)
})
