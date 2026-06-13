import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { apiRouteCatalog, type ApiRouteCatalogEntry } from '~/server/apiRouteCatalog'

const pagesApiDir = join(process.cwd(), 'src/pages/api')
const srcDir = join(process.cwd(), 'src')
const apiRouteCatalogFile = join(srcDir, 'server/apiRouteCatalog.ts')
const apiRouteCatalogTestFile = join(srcDir, 'server/__tests__/apiRouteCatalog.test.ts')

function staleReference(...parts: string[]) {
	return parts.join('')
}

function walkFiles(dir: string, extensions = ['.ts']): string[] {
	const files: string[] = []

	for (const name of readdirSync(dir)) {
		const filePath = join(dir, name)
		const stat = statSync(filePath)
		if (stat.isDirectory()) {
			files.push(...walkFiles(filePath, extensions))
			continue
		}
		if (extensions.some((extension) => filePath.endsWith(extension))) {
			files.push(filePath)
		}
	}

	return files
}

function routePathFromFile(filePath: string) {
	const relativePath = relative(pagesApiDir, filePath).split(sep).join('/').replace(/\.ts$/, '')
	const [kind, ...routeParts] = relativePath.split('/')
	const routePath = routeParts.join('/').replace(/\/index$/, '')

	return `/api/${kind}/${routePath}`
}

function filePathForEntry(entry: ApiRouteCatalogEntry) {
	const directPath = join(pagesApiDir, entry.kind, `${entry.path}.ts`)
	const indexPath = join(pagesApiDir, entry.kind, entry.path, 'index.ts')

	return existsSync(directPath) ? directPath : indexPath
}

function isProductionSourceFile(filePath: string) {
	if (!/\.(ts|tsx)$/.test(filePath)) return false
	if (filePath === apiRouteCatalogFile) return false
	if (filePath.includes(`${sep}__tests__${sep}`)) return false
	if (/\.(test|spec)\.(ts|tsx)$/.test(filePath)) return false
	return true
}

describe('api route catalog', () => {
	it('lists every pages/api route exactly once', () => {
		const catalogPaths = apiRouteCatalog.map((entry) => entry.canonicalPath).toSorted()
		const filePaths = walkFiles(pagesApiDir).map(routePathFromFile).toSorted()

		expect(new Set(catalogPaths).size).toBe(catalogPaths.length)
		expect(filePaths).toEqual(catalogPaths)
	})

	it('points every catalog entry at an existing route file', () => {
		for (const entry of apiRouteCatalog) {
			expect(existsSync(filePathForEntry(entry)), `${entry.canonicalPath} should resolve to a route file`).toBe(true)
		}
	})

	it('marks the cross-instance revalidation route as POST-only', () => {
		expect(
			apiRouteCatalog.find((entry) => entry.canonicalPath === '/api/private/revalidate-instances')?.methods
		).toEqual(['POST'])
	})

	it('keeps auth-sensitive reads out of public routes', () => {
		const forbiddenPatterns = [
			/validateSubscription/,
			/headers\??\.authorization/,
			/headers\[['"]authorization['"]\]/,
			/authorizationHeader\s*\(/,
			/req\.cookies/,
			/cookies\[/
		]

		for (const entry of apiRouteCatalog.filter((route) => route.kind === 'public')) {
			const source = readFileSync(filePathForEntry(entry), 'utf8')

			for (const pattern of forbiddenPatterns) {
				expect(source, `${entry.canonicalPath} should not match ${pattern}`).not.toMatch(pattern)
			}
		}
	})

	it('keeps shared cache headers out of private routes', () => {
		for (const entry of apiRouteCatalog.filter((route) => route.kind === 'private')) {
			const source = readFileSync(filePathForEntry(entry), 'utf8')

			expect(source, `${entry.canonicalPath} should not emit shared-cache headers`).not.toMatch(
				/res\.setHeader\(\s*['"]Cache-Control['"][\s\S]{0,160}public,/
			)
		}
	})

	it('keeps production relative API paths on canonical grouped URLs', () => {
		const legacyApiPaths: string[] = []
		const legacyRelativeApiPathPattern = /['"`](\/api\/(?!public\/|private\/|dynamic\/)[^'"`\s)]*)/g

		for (const filePath of walkFiles(srcDir, ['.ts', '.tsx']).filter(isProductionSourceFile)) {
			const relativePath = relative(process.cwd(), filePath)
			const lines = readFileSync(filePath, 'utf8').split('\n')

			for (const [index, line] of lines.entries()) {
				if (line.trim().startsWith('//')) continue

				for (const match of line.matchAll(legacyRelativeApiPathPattern)) {
					const apiPath = match[1]
					if (apiPath === '/api/:path*') continue
					legacyApiPaths.push(`${relativePath}:${index + 1} ${apiPath}`)
				}
			}
		}

		expect(legacyApiPaths).toEqual([])
	})

	it('keeps removed route buckets and imports from returning', () => {
		const staleReferences: string[] = []
		const stalePatterns = [
			staleReference('/api/public/', 'datasets'),
			staleReference('/api/private/', 'datasets'),
			staleReference('/api/dynamic/', 'datasets'),
			staleReference('/api/public/protocols/', 'split'),
			staleReference('~/server/', 'routeCache'),
			staleReference('server/', 'routeCache'),
			staleReference('server/', 'cexAnalytics'),
			staleReference('ProDashboard/server/', 'datasetFetchers'),
			staleReference('protocol', 'Split')
		]

		for (const filePath of walkFiles(srcDir, ['.ts', '.tsx', '.md']).filter((filePath) => {
			if (filePath === apiRouteCatalogFile) return false
			if (filePath === apiRouteCatalogTestFile) return false
			return !filePath.includes(`${sep}node_modules${sep}`)
		})) {
			const source = readFileSync(filePath, 'utf8')
			const relativePath = relative(process.cwd(), filePath)
			for (const pattern of stalePatterns) {
				if (source.includes(pattern)) {
					staleReferences.push(`${relativePath} contains ${pattern}`)
				}
			}
		}

		expect(staleReferences).toEqual([])
	})
})
