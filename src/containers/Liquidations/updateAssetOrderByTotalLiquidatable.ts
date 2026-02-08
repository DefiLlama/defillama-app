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

	const start = original.indexOf('export const DEFAULT_ASSETS_LIST_RAW')
	if (start === -1) {
		throw new Error('Could not find DEFAULT_ASSETS_LIST_RAW in constants.ts')
	}

	const arrayStart = original.indexOf('[', start)
	const closeIndex = original.indexOf(']\n\nexport const DEFAULT_ASSETS_LIST', arrayStart)
	if (arrayStart === -1 || closeIndex === -1) {
		throw new Error('Could not locate DEFAULT_ASSETS_LIST_RAW array bounds in constants.ts')
	}
	const arrayEnd = closeIndex + 1 // include closing ']'

	const newArray = `[\n${assets.map(formatAssetEntry).join(',\n')}\n]`
	const updated = original.slice(0, arrayStart) + newArray + original.slice(arrayEnd)

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
