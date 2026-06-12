import { promises as fs } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SCAN_ROOTS = ['src/pages', 'src/components', 'src/containers', 'src/layout']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const SERVER_CACHE_IMPORT_PREFIXES = ['~/server/datasetCache', '~/server/routeCache']
const PAGE_DATA_FUNCTIONS = new Set(['getStaticProps', 'getStaticPaths', 'getServerSideProps'])

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

function isServerCacheImport(specifier: string): boolean {
	return SERVER_CACHE_IMPORT_PREFIXES.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`))
}

function relativeSourcePath(filePath: string): string {
	return path.relative(process.cwd(), filePath).split(path.sep).join('/')
}

function isApiRouteFile(filePath: string): boolean {
	return relativeSourcePath(filePath).startsWith('src/pages/api/')
}

function isPageFile(filePath: string): boolean {
	const relativePath = relativeSourcePath(filePath)
	return relativePath.startsWith('src/pages/') && !relativePath.startsWith('src/pages/api/')
}

function hasExportModifier(node: ts.Node): boolean {
	return Boolean(
		ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
	)
}

function isInsideFunction(node: ts.Node): boolean {
	for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
		if (
			ts.isFunctionDeclaration(current) ||
			ts.isFunctionExpression(current) ||
			ts.isArrowFunction(current) ||
			ts.isMethodDeclaration(current)
		) {
			return true
		}
	}
	return false
}

function collectPageDataHandlerNames(sourceFile: ts.SourceFile): Set<string> {
	const handlerNames = new Set<string>()

	function collectIdentifier(node: ts.Node) {
		if (ts.isIdentifier(node)) {
			handlerNames.add(node.text)
		}
	}

	function collectInitializerHandlers(node: ts.Expression) {
		if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) {
			collectInitializerHandlers(node.expression)
			return
		}

		if (ts.isIdentifier(node)) {
			collectIdentifier(node)
			return
		}

		if (ts.isCallExpression(node)) {
			for (const argument of node.arguments) collectIdentifier(argument)
		}
	}

	function visit(node: ts.Node) {
		if (ts.isVariableStatement(node) && hasExportModifier(node)) {
			for (const declaration of node.declarationList.declarations) {
				if (!ts.isIdentifier(declaration.name) || !PAGE_DATA_FUNCTIONS.has(declaration.name.text)) continue
				if (declaration.initializer) collectInitializerHandlers(declaration.initializer)
			}
		}

		ts.forEachChild(node, visit)
	}

	visit(sourceFile)
	return handlerNames
}

function isInsideExportedPageDataFunction(node: ts.Node, handlerNames: Set<string>): boolean {
	for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
		if (ts.isFunctionDeclaration(current) && current.name && handlerNames.has(current.name.text)) {
			return true
		}

		if (
			ts.isFunctionDeclaration(current) &&
			current.name &&
			PAGE_DATA_FUNCTIONS.has(current.name.text) &&
			hasExportModifier(current)
		) {
			return true
		}

		if (
			ts.isVariableDeclaration(current) &&
			ts.isIdentifier(current.name) &&
			PAGE_DATA_FUNCTIONS.has(current.name.text)
		) {
			for (let parent: ts.Node | undefined = current.parent; parent; parent = parent.parent) {
				if (ts.isVariableStatement(parent)) return hasExportModifier(parent)
			}
		}

		if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name) && handlerNames.has(current.name.text)) {
			return true
		}
	}
	return false
}

function getLine(sourceFile: ts.SourceFile, node: ts.Node): number {
	return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function isAllowedTypeImport(node: ts.ImportDeclaration, specifier: string): boolean {
	return Boolean(node.importClause?.isTypeOnly && specifier.endsWith('.types'))
}

function getScriptKind(filePath: string): ts.ScriptKind {
	const extension = path.extname(filePath)
	if (extension === '.tsx') return ts.ScriptKind.TSX
	if (extension === '.jsx') return ts.ScriptKind.JSX
	if (extension === '.js') return ts.ScriptKind.JS
	return ts.ScriptKind.TS
}

describe('dataset cache import boundary', () => {
	it('keeps server cache imports inside page data functions and API handlers', async () => {
		const errors: string[] = []
		const files = (await Promise.all(SCAN_ROOTS.map(collectSourceFiles))).flat()

		for (const filePath of files) {
			const source = await fs.readFile(filePath, 'utf8')
			if (!SERVER_CACHE_IMPORT_PREFIXES.some((prefix) => source.includes(prefix))) continue

			const relativePath = relativeSourcePath(filePath)
			const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath))
			const pageDataHandlerNames = collectPageDataHandlerNames(sourceFile)

			function visit(node: ts.Node) {
				if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
					const specifier = node.moduleSpecifier.text
					if (isServerCacheImport(specifier) && !isAllowedTypeImport(node, specifier)) {
						errors.push(`${relativePath}:${getLine(sourceFile, node)} static import ${specifier}`)
					}
				}

				if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
					const [specifierNode] = node.arguments
					if (!specifierNode || !ts.isStringLiteral(specifierNode)) {
						ts.forEachChild(node, visit)
						return
					}

					const specifier = specifierNode.text
					if (isServerCacheImport(specifier)) {
						const isAllowed =
							(isPageFile(filePath) && isInsideExportedPageDataFunction(node, pageDataHandlerNames)) ||
							(isApiRouteFile(filePath) && isInsideFunction(node))
						if (!isAllowed) errors.push(`${relativePath}:${getLine(sourceFile, node)} dynamic import ${specifier}`)
					}
				}

				ts.forEachChild(node, visit)
			}

			visit(sourceFile)
		}

		expect(errors).toEqual([])
	})
})
