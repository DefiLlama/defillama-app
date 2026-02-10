import fs from 'fs'
import { fileURLToPath } from 'url'
import { LIQUIDATIONS_HISTORICAL_R2_PATH } from '../../constants'
import { DEFAULT_ASSETS_LIST_RAW } from './constants'

type TotalsBySymbol = Record<string, number>

async function fetchJson<T = unknown>(url: string): Promise<T> {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
	return (await res.json()) as T
}

async function mapLimit<T, R>(
	items: readonly T[],
	limit: number,
	mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	const results: R[] = new Array(items.length)
	let nextIndex = 0

	async function worker() {
		while (true) {
			const index = nextIndex++
			if (index >= items.length) return
			results[index] = await mapper(items[index], index)
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
	return results
}

function formatAssetEntry(asset: { name: string; symbol: string }) {
	return `\t{\n\t\tname: ${JSON.stringify(asset.name)},\n\t\tsymbol: ${JSON.stringify(asset.symbol)}\n\t}`
}

function findMatchingClosingBracket(source: string, openingBracketIndex: number) {
	let depth = 0
	let inLineComment = false
	let inBlockComment = false
	let inSingleQuote = false
	let inDoubleQuote = false
	let inTemplateString = false
	let escaped = false

	for (let i = openingBracketIndex; i < source.length; i++) {
		const ch = source[i]
		const next = source[i + 1]

		if (inLineComment) {
			if (ch === '\n') inLineComment = false
			continue
		}

		if (inBlockComment) {
			if (ch === '*' && next === '/') {
				inBlockComment = false
				i++
			}
			continue
		}

		if (inSingleQuote) {
			if (escaped) {
				escaped = false
				continue
			}
			if (ch === '\\') {
				escaped = true
				continue
			}
			if (ch === "'") inSingleQuote = false
			continue
		}

		if (inDoubleQuote) {
			if (escaped) {
				escaped = false
				continue
			}
			if (ch === '\\') {
				escaped = true
				continue
			}
			if (ch === '"') inDoubleQuote = false
			continue
		}

		if (inTemplateString) {
			if (escaped) {
				escaped = false
				continue
			}
			if (ch === '\\') {
				escaped = true
				continue
			}
			if (ch === '`') inTemplateString = false
			continue
		}

		// entering comments
		if (ch === '/' && next === '/') {
			inLineComment = true
			i++
			continue
		}
		if (ch === '/' && next === '*') {
			inBlockComment = true
			i++
			continue
		}

		// entering strings
		if (ch === "'") {
			inSingleQuote = true
			continue
		}
		if (ch === '"') {
			inDoubleQuote = true
			continue
		}
		if (ch === '`') {
			inTemplateString = true
			continue
		}

		if (ch === '[') {
			depth++
			continue
		}
		if (ch === ']') {
			depth--
			if (depth === 0) return i
		}
	}

	return -1
}

function replaceExportedConstArray(source: string, constName: string, newArray: string) {
	const start = source.indexOf(`export const ${constName}`)
	if (start === -1) {
		throw new Error(`Could not find ${constName} in constants.ts`)
	}

	const arrayStart = source.indexOf('[', start)
	if (arrayStart === -1) {
		throw new Error(`Could not locate ${constName} array opening bracket in constants.ts`)
	}

	const closeIndex = findMatchingClosingBracket(source, arrayStart)
	if (closeIndex === -1) {
		throw new Error(`Could not locate ${constName} array closing bracket in constants.ts`)
	}
	const arrayEnd = closeIndex + 1 // include closing ']'

	return source.slice(0, arrayStart) + newArray + source.slice(arrayEnd)
}

async function getTotalsBySymbol(symbols: string[]): Promise<TotalsBySymbol> {
	const entries = await mapLimit(symbols, 10, async (symbol) => {
		const key = symbol.toLowerCase()
		try {
			const data = await fetchJson<{
				currentPrice: number
				positions: Array<{ liqPrice: number; collateralValue: number }>
			}>(`${LIQUIDATIONS_HISTORICAL_R2_PATH}/${key}/latest.json`)
			const currentPrice = typeof data.currentPrice === 'number' ? data.currentPrice : 0
			const positions = Array.isArray(data.positions) ? data.positions : []
			const valid = positions.filter((p) => p.liqPrice <= currentPrice && p.liqPrice > currentPrice / 1_000_000)
			const total = valid.reduce((acc, p) => acc + (Number(p.collateralValue) || 0), 0)
			return [key, total] as const
		} catch {
			return [key, 0] as const
		}
	})

	return Object.fromEntries(entries) as TotalsBySymbol
}

async function main() {
	const assets = DEFAULT_ASSETS_LIST_RAW.map((a) => ({ ...a }))
	const totals = await getTotalsBySymbol(assets.map((a) => a.symbol))

	assets.sort((a, b) => {
		const aKey = a.symbol.toLowerCase()
		const bKey = b.symbol.toLowerCase()
		const diff = (totals[bKey] ?? 0) - (totals[aKey] ?? 0)
		if (diff !== 0) return diff
		return a.name.localeCompare(b.name)
	})

	const constantsPath = fileURLToPath(new URL('./constants.ts', import.meta.url))
	const original = fs.readFileSync(constantsPath, 'utf-8')

	const newArray = `[\n${assets.map(formatAssetEntry).join(',\n')}\n]`
	const updated = replaceExportedConstArray(original, 'DEFAULT_ASSETS_LIST_RAW', newArray)

	fs.writeFileSync(constantsPath, updated)

	console.log('Updated DEFAULT_ASSETS_LIST_RAW order in constants.ts')
	console.log('Top 10 by total liquidatable (USD):')
	for (const a of assets.slice(0, 10)) {
		const key = a.symbol.toLowerCase()
		console.log(`${a.symbol}\t${(totals[key] ?? 0).toFixed(2)}`)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
