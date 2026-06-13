import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

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

function getModuleSpecifiers(source: string): string[] {
	const specifiers: string[] = []
	let statement: string | null = null

	for (const line of source.split('\n')) {
		const trimmed = line.trim()
		if (!statement && !/^(?:import\b|export\s+(?:\*|\{))/.test(trimmed)) continue

		statement = statement ? `${statement}\n${line}` : line

		if (/\sfrom\s+['"][^'"]+['"]/.test(statement) || /^import\s+['"][^'"]+['"]/.test(statement.trim())) {
			const normalizedStatement = statement.trim()
			const isTypeOnlyStatement =
				/^import\s+type\b/.test(normalizedStatement) || /^export\s+type\b/.test(normalizedStatement)
			const match =
				normalizedStatement.match(/\sfrom\s+['"]([^'"]+)['"]/) ??
				normalizedStatement.match(/^import\s+['"]([^'"]+)['"]/)
			if (!isTypeOnlyStatement && match?.[1]) specifiers.push(match[1])
			statement = null
		}
	}

	for (const match of source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) {
		specifiers.push(match[1])
	}

	return specifiers
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

function toRelativePath(filePath: string): string {
	return path.relative(process.cwd(), filePath).split(path.sep).join('/')
}

function isContainerCachePath(relativePath: string): boolean {
	return /^src\/containers\/[^/]+\/server\/.*\.cache\.(ts|tsx|js|jsx)$/.test(relativePath)
}

function isContainerCacheSpecifier(fromFile: string, specifier: string): boolean {
	if (/^~\/containers\/[^/]+\/server\/.*\.cache(?:$|[/.])/.test(specifier)) return true
	const resolved = resolveInternalSpecifier(fromFile, specifier)
	return resolved ? isContainerCachePath(toRelativePath(resolved)) : false
}

function isDatasetCacheSpecifier(specifier: string): boolean {
	return /(?:^|\/)dataset(?:\.[^/]+)?\.cache$/.test(specifier)
}

function isDomainRoutesFile(relativePath: string): boolean {
	return /^src\/containers\/[^/]+\/server\/routes\.(ts|tsx|js|jsx)$/.test(relativePath)
}

function isApiHandlerFile(relativePath: string): boolean {
	if (relativePath.startsWith('src/pages/api/')) return true
	return /^src\/containers\/[^/]+\/server\/(?:api|.*Routes)\.(ts|tsx|js|jsx)$/.test(relativePath)
}

describe('dataset cache route boundaries', () => {
	it('collects runtime re-export specifiers as boundary edges', () => {
		expect(
			getModuleSpecifiers(`
				export {
					fetchRaisesFromCache
				} from './dataset.cache'
				export * from '~/containers/Cexs/server/dataset.markets.cache'
				export type { RawRaise } from '~/containers/Raises/api.types'
			`)
		).toEqual(['./dataset.cache', '~/containers/Cexs/server/dataset.markets.cache'])
	})

	it('keeps page and API handlers from importing raw domain cache readers', async () => {
		const errors: string[] = []
		const files = await collectSourceFiles('src')

		for (const filePath of files) {
			const relativePath = toRelativePath(filePath)
			if (!relativePath.startsWith('src/pages/') && !isApiHandlerFile(relativePath)) continue

			const source = await fs.readFile(filePath, 'utf8')
			for (const specifier of getModuleSpecifiers(source)) {
				if (isContainerCacheSpecifier(filePath, specifier)) {
					errors.push(`${relativePath}: ${specifier}`)
				}
			}
		}

		expect(errors).toEqual([])
	}, 15_000)

	it('keeps domain routes modules from importing dataset cache readers directly', async () => {
		const errors: string[] = []
		const files = (await collectSourceFiles('src/containers')).filter((filePath) =>
			isDomainRoutesFile(toRelativePath(filePath))
		)

		for (const filePath of files) {
			const source = await fs.readFile(filePath, 'utf8')
			for (const specifier of getModuleSpecifiers(source)) {
				if (isDatasetCacheSpecifier(specifier)) {
					errors.push(`${toRelativePath(filePath)}: ${specifier}`)
				}
			}
		}

		expect(errors).toEqual([])
	}, 15_000)
})
