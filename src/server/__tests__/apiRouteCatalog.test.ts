import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { apiRouteCatalog, getLegacyApiRouteRewrites, type ApiRouteCatalogEntry } from '~/server/apiRouteCatalog'

const pagesApiDir = join(process.cwd(), 'src/pages/api')

function walkFiles(dir: string): string[] {
	const files: string[] = []

	for (const name of readdirSync(dir)) {
		const filePath = join(dir, name)
		const stat = statSync(filePath)
		if (stat.isDirectory()) {
			files.push(...walkFiles(filePath))
			continue
		}
		if (filePath.endsWith('.ts')) {
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

describe('api route catalog', () => {
	it('lists every pages/api route exactly once', () => {
		const catalogPaths = apiRouteCatalog.map((entry) => entry.newPath).toSorted()
		const filePaths = walkFiles(pagesApiDir).map(routePathFromFile).toSorted()

		expect(new Set(catalogPaths).size).toBe(catalogPaths.length)
		expect(filePaths).toEqual(catalogPaths)
	})

	it('points every catalog entry at an existing route file', () => {
		for (const entry of apiRouteCatalog) {
			expect(existsSync(filePathForEntry(entry)), `${entry.newPath} should resolve to a route file`).toBe(true)
		}
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
				expect(source, `${entry.newPath} should not match ${pattern}`).not.toMatch(pattern)
			}
		}
	})

	it('keeps shared cache headers out of private routes', () => {
		for (const entry of apiRouteCatalog.filter((route) => route.kind === 'private')) {
			const source = readFileSync(filePathForEntry(entry), 'utf8')

			expect(source, `${entry.newPath} should not emit shared-cache headers`).not.toMatch(
				/res\.setHeader\(\s*['"]Cache-Control['"][\s\S]{0,160}public,/
			)
		}
	})

	it('generates legacy rewrites from old URLs to canonical grouped URLs', () => {
		const rewrites = getLegacyApiRouteRewrites()

		expect(new Set(rewrites.map((rewrite) => rewrite.source)).size).toBe(apiRouteCatalog.length)
		expect(rewrites).toContainEqual({
			source: '/api/charts/protocol',
			destination: '/api/public/charts/protocol'
		})
		expect(rewrites).toContainEqual({
			source: '/api/liquidations/:protocol/:chain',
			destination: '/api/private/liquidations/:protocol/:chain'
		})
		expect(rewrites).toContainEqual({
			source: '/api/dashboard/:dashboardId/stream',
			destination: '/api/dynamic/dashboard/:dashboardId/stream'
		})
	})
})
