import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SCAN_ROOTS = ['src', 'scripts']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const METADATA_ARTIFACT_IMPORT = '.cache/app-metadata'
const SERVER_DATA_IMPORT_PREFIXES = ['~/server/datasetCache', '~/server/routeRegistry']
const CLIENT_ENTRY_ROOTS = ['src/pages', 'src/components', 'src/containers']

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

function getStaticRuntimeImportSpecifiers(source: string): string[] {
	const specifiers: string[] = []

	for (const statement of getStaticImportStatements(source)) {
		if (/^\s*import\s+type\b/.test(statement)) continue

		const match = statement.match(/\sfrom\s+['"]([^'"]+)['"]/) ?? statement.match(/^\s*import\s+['"]([^'"]+)['"]/)
		if (match?.[1]) specifiers.push(match[1])
	}

	return specifiers
}

function isForbiddenServerDataImport(specifier: string): boolean {
	if (specifier === '~/utils/metadata' || specifier === '~/utils/metadata/index') return true
	if (/^~\/containers\/[^/]+\/server\/.*\.cache(?:$|[/.])/.test(specifier)) return true
	return SERVER_DATA_IMPORT_PREFIXES.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`))
}

function isClientEntry(filePath: string): boolean {
	const relativePath = path.relative(process.cwd(), filePath).split(path.sep).join('/')
	if (!CLIENT_ENTRY_ROOTS.some((root) => relativePath.startsWith(`${root}/`))) return false
	if (relativePath.startsWith('src/pages/api/')) return false
	if (relativePath.includes('/__tests__/')) return false
	return true
}

function isApiFile(filePath: string): boolean {
	return path.relative(process.cwd(), filePath).split(path.sep).join('/').startsWith('src/pages/api/')
}

function resolveInternalSpecifier(fromFile: string, specifier: string): string | null {
	let basePath: string
	if (specifier.startsWith('~/')) {
		basePath = path.join(process.cwd(), 'src', specifier.slice(2))
	} else if (specifier.startsWith('.')) {
		basePath = path.resolve(path.dirname(fromFile), specifier)
	} else {
		return null
	}

	for (const candidate of [
		basePath,
		`${basePath}.ts`,
		`${basePath}.tsx`,
		`${basePath}.js`,
		`${basePath}.jsx`,
		path.join(basePath, 'index.ts'),
		path.join(basePath, 'index.tsx'),
		path.join(basePath, 'index.js'),
		path.join(basePath, 'index.jsx')
	]) {
		if (SOURCE_EXTENSIONS.has(path.extname(candidate)) && existsSync(candidate)) return candidate
	}

	return null
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

	it('keeps server metadata and dataset readers out of page and client runtime imports', async () => {
		const errors: string[] = []
		const allSourceFiles = await collectSourceFiles('src')
		const files = allSourceFiles.filter((filePath) => {
			const relativePath = path.relative(process.cwd(), filePath).split(path.sep).join('/')
			// Domain server modules (containers/*/server) are server-only code and may
			// statically import dataset readers; the boundary guards page/client code.
			if (/^src\/containers\/[^/]+\/server\//.test(relativePath)) return false
			return (
				(relativePath.startsWith('src/pages/') && !relativePath.startsWith('src/pages/api/')) ||
				relativePath.startsWith('src/components/') ||
				relativePath.startsWith('src/containers/')
			)
		})
		const sourceByFile = new Map<string, string>()

		await Promise.all(
			allSourceFiles.map(async (filePath) => {
				sourceByFile.set(filePath, await fs.readFile(filePath, 'utf8'))
			})
		)

		for (const filePath of files) {
			const source = sourceByFile.get(filePath)
			if (!source) continue

			const relativePath = path.relative(process.cwd(), filePath).split(path.sep).join('/')
			for (const specifier of getStaticRuntimeImportSpecifiers(source)) {
				if (isForbiddenServerDataImport(specifier)) {
					errors.push(`${relativePath}: ${specifier}`)
				}
			}
		}

		const clientEntries = files.filter(isClientEntry)
		const visited = new Set<string>()

		function visit(filePath: string, stack: string[]) {
			if (visited.has(filePath)) return
			visited.add(filePath)

			const source = sourceByFile.get(filePath)
			if (!source) return

			for (const specifier of getStaticRuntimeImportSpecifiers(source)) {
				const resolved = resolveInternalSpecifier(filePath, specifier)
				if (!resolved) continue

				const relativeResolved = path.relative(process.cwd(), resolved).split(path.sep).join('/')
				if (
					relativeResolved === 'src/utils/metadata/index.ts' ||
					relativeResolved === 'src/utils/metadata/index.tsx' ||
					relativeResolved.startsWith('src/server/datasetCache/') ||
					relativeResolved.startsWith('src/server/routeRegistry/') ||
					/^src\/containers\/[^/]+\/server\/.*\.cache\.(ts|tsx|js|jsx)$/.test(relativeResolved)
				) {
					errors.push(`${stack.join(' -> ')} -> ${relativeResolved}`)
					continue
				}

				if (sourceByFile.has(resolved) && !isApiFile(resolved)) {
					visit(resolved, [...stack, relativeResolved])
				}
			}
		}

		for (const entry of clientEntries) {
			visit(entry, [path.relative(process.cwd(), entry).split(path.sep).join('/')])
		}

		expect(errors).toEqual([])
	}, 15_000)
})
