import { promises as fs } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SCAN_ROOTS = ['src', 'scripts']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const METADATA_ARTIFACT_IMPORT = '.cache/app-metadata'

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
		files.push(filePath)
	}

	return files
}

function getStaticImportStatements(source: string): string[] {
	const statements: string[] = []
	let statement: string | null = null

	for (const line of source.split('\n')) {
		const trimmed = line.trim()
		if (!statement && !/^import\b/.test(trimmed)) continue

		statement = statement ? `${statement}\n${line}` : line

		if (/\sfrom\s+['"][^'"]+['"]/.test(statement) || /^import\s+['"][^'"]+['"]/.test(statement.trim())) {
			statements.push(statement)
			statement = null
		}
	}

	return statements
}

describe('metadata artifact import boundary', () => {
	it('keeps generated metadata artifacts behind the filesystem loader', async () => {
		const errors: string[] = []
		const files = (await Promise.all(SCAN_ROOTS.map(collectSourceFiles))).flat()

		await Promise.all(
			files.map(async (filePath) => {
				const source = await fs.readFile(filePath, 'utf8')
				if (!source.includes(METADATA_ARTIFACT_IMPORT)) return

				for (const statement of getStaticImportStatements(source)) {
					if (!statement.includes(METADATA_ARTIFACT_IMPORT)) continue
					const relativePath = path.relative(process.cwd(), filePath).split(path.sep).join('/')
					errors.push(`${relativePath}: ${statement.trim().replaceAll(/\s+/g, ' ')}`)
				}
			})
		)

		expect(errors).toEqual([])
	}, 15_000)
})
