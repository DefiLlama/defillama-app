import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const srcRoot = join(process.cwd(), 'src')
const yieldsRoot = join(srcRoot, 'containers', 'Yields')
const forbiddenYieldsImports = [
	'~/containers/Yields',
	'~/containers/Yields/queries',
	'~/containers/Yields/queries/index',
	'~/containers/Yields/queries/client',
	'~/containers/Yields/utils',
	'~/containers/Yields/indexBorrow',
	'~/containers/Yields/indexLoop',
	'~/containers/Yields/indexPlots',
	'~/containers/Yields/indexOptimizer',
	'~/containers/Yields/indexStrategy',
	'~/containers/Yields/indexStrategyLongShort',
	'~/containers/Yields/Watchlist'
]
const forbiddenRelativeYieldsImports = [
	'../queries',
	'./queries',
	'../queries/client',
	'../queries/index',
	'../index',
	'./index',
	'../utils',
	'./utils'
]
const forbiddenDomainImports = [
	'../queries.server',
	'../queries.client',
	'~/containers/Yields/queries.server',
	'~/containers/Yields/queries.client'
]
const removedYieldsFiles = [join(yieldsRoot, 'index.ts')]

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function importsSpecifier(contents: string, specifier: string) {
	const escaped = escapeRegExp(specifier)
	return new RegExp(
		`(?:from\\s+['"]${escaped}['"]|export\\s+.*\\s+from\\s+['"]${escaped}['"]|import\\s+['"]${escaped}['"]|import\\s*\\(\\s*['"]${escaped}['"]\\s*\\)|require\\s*\\(\\s*['"]${escaped}['"]\\s*\\))`
	).test(contents)
}

function listSourceFiles(dir: string): string[] {
	const entries = readdirSync(dir)
	const files: string[] = []

	for (const entry of entries) {
		const path = join(dir, entry)
		const stat = statSync(path)
		if (stat.isDirectory()) {
			files.push(...listSourceFiles(path))
		} else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !path.endsWith('architecture.test.ts')) {
			files.push(path)
		}
	}

	return files
}

describe('Yields import boundaries', () => {
	it('detects forbidden specifiers in imports and re-exports', () => {
		expect(importsSpecifier("import value from '~/containers/Yields'", '~/containers/Yields')).toBe(true)
		expect(importsSpecifier("export * from '~/containers/Yields'", '~/containers/Yields')).toBe(true)
		expect(importsSpecifier("export { value } from '~/containers/Yields'", '~/containers/Yields')).toBe(true)
	})

	it('does not import removed Yields utility, query, or view paths', () => {
		const violations: string[] = []

		for (const file of listSourceFiles(srcRoot)) {
			const contents = readFileSync(file, 'utf8')
			const forbiddenImports = file.includes('/src/containers/Yields/')
				? [...forbiddenYieldsImports, ...forbiddenRelativeYieldsImports]
				: forbiddenYieldsImports
			if (file.includes('/src/containers/Yields/domain/')) {
				forbiddenImports.push(...forbiddenDomainImports)
			}

			for (const forbiddenImport of forbiddenImports) {
				if (importsSpecifier(contents, forbiddenImport)) {
					violations.push(`${file.replace(process.cwd() + '/', '')}: ${forbiddenImport}`)
				}
			}
		}

		expect(violations).toEqual([])
	})

	it('does not recreate the root Yields barrel file', () => {
		expect(removedYieldsFiles.filter((file) => existsSync(file))).toEqual([])
	})
})
