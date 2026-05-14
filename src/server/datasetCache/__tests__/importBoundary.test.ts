import { promises as fs } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SCAN_ROOTS = ['src/pages', 'src/components', 'src/containers', 'src/layout']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const DATASET_CACHE_IMPORT_PREFIX = '~/server/datasetCache'

async function collectSourceFiles(rootDir: string): Promise<string[]> {
	const entries = await fs.readdir(rootDir, { withFileTypes: true })
	const files: string[] = []

	for (const entry of entries) {
		const filePath = path.join(rootDir, entry.name)
		if (entry.isDirectory()) {
			if (entry.name === '__tests__') continue
			files.push(...(await collectSourceFiles(filePath)))
			continue
		}

		if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue
		if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue
		files.push(filePath)
	}

	return files
}

function getStaticImportStatements(source: string): string[] {
	const statements: string[] = []
	let statement: string | null = null

	for (const line of source.split('\n')) {
		const trimmed = line.trim()
		if (!statement && !trimmed.startsWith('import ')) continue

		statement = statement ? `${statement}\n${line}` : line

		if (/\sfrom\s+['"][^'"]+['"]/.test(statement) || /^import\s+['"][^'"]+['"]/.test(statement.trim())) {
			statements.push(statement)
			statement = null
		}
	}

	return statements
}

describe('dataset cache import boundary', () => {
	it('keeps production page and UI modules from statically importing dataset cache runtime code', async () => {
		const errors: string[] = []
		const files = (await Promise.all(SCAN_ROOTS.map(collectSourceFiles))).flat()

		for (const filePath of files) {
			const source = await fs.readFile(filePath, 'utf8')
			if (!source.includes(DATASET_CACHE_IMPORT_PREFIX)) continue

			for (const statement of getStaticImportStatements(source)) {
				const sourceMatch = statement.match(/\sfrom\s+['"]([^'"]+)['"]|^import\s+['"]([^'"]+)['"]/)
				const importSource = sourceMatch?.[1] ?? sourceMatch?.[2]
				if (!importSource?.startsWith(DATASET_CACHE_IMPORT_PREFIX)) continue

				const relativePath = path.relative(process.cwd(), filePath).split(path.sep).join('/')
				const isTypeImport = statement.trim().startsWith('import type ')
				if (isTypeImport && importSource.endsWith('.types')) continue

				errors.push(`${relativePath}: ${statement.trim().replaceAll(/\s+/g, ' ')}`)
			}
		}

		expect(errors).toEqual([])
	})
})
