import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC_DIR = path.join(process.cwd(), 'src')
const TABLE_USAGE_PATTERN = /components\/Table\/(Table|TableWithSearch)['"]|<VirtualTable\b|<TableWithSearch\b/

function sourceFiles(dir: string): string[] {
	const files: string[] = []
	for (const entry of readdirSync(dir)) {
		const fullPath = path.join(dir, entry)
		if (fullPath.includes(`${path.sep}containers${path.sep}ProDashboard${path.sep}`)) {
			continue
		}
		const stats = statSync(fullPath)
		if (stats.isDirectory()) {
			files.push(...sourceFiles(fullPath))
		} else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
			files.push(fullPath)
		}
	}
	return files
}

function propertyName(name: ts.PropertyName): string | undefined {
	if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
		return name.text
	}
}

function hasObjectProperty(node: ts.ObjectLiteralExpression, property: string) {
	for (const prop of node.properties) {
		if (ts.isPropertyAssignment(prop) && propertyName(prop.name) === property) {
			return true
		}
		if (ts.isShorthandPropertyAssignment(prop) && prop.name.text === property) {
			return true
		}
	}
	return false
}

function getObjectProperty(node: ts.ObjectLiteralExpression, property: string): ts.Node | undefined {
	for (const prop of node.properties) {
		if (ts.isPropertyAssignment(prop) && propertyName(prop.name) === property) {
			return prop.initializer
		}
		if (ts.isShorthandPropertyAssignment(prop) && prop.name.text === property) {
			return prop
		}
	}
}

function hasMetaProperty(config: ts.ObjectLiteralExpression, property: string) {
	const meta = getObjectProperty(config, 'meta')
	return Boolean(meta && ts.isObjectLiteralExpression(meta) && hasObjectProperty(meta, property))
}

function compactNodeText(sourceFile: ts.SourceFile, node: ts.Node | undefined) {
	return node?.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 120) ?? ''
}

describe('VirtualTable column sizing', () => {
	it('keeps shared VirtualTable leaf columns explicitly CSS-sized through headerClassName', () => {
		const failures: string[] = []

		for (const file of sourceFiles(SRC_DIR)) {
			const source = readFileSync(file, 'utf8')
			if (!TABLE_USAGE_PATTERN.test(source)) {
				continue
			}

			const sourceFile = ts.createSourceFile(
				file,
				source,
				ts.ScriptTarget.Latest,
				true,
				file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
			)

			function visit(node: ts.Node) {
				if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
					ts.forEachChild(node, visit)
					return
				}

				const method = node.expression.name.text
				if (method !== 'accessor' && method !== 'display') {
					ts.forEachChild(node, visit)
					return
				}

				const config = node.arguments[node.arguments.length - 1]
				if (!config || !ts.isObjectLiteralExpression(config)) {
					ts.forEachChild(node, visit)
					return
				}

				const relativePath = path.relative(process.cwd(), file)
				const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
				const id = compactNodeText(sourceFile, getObjectProperty(config, 'id') ?? node.arguments[0])
				const header = compactNodeText(sourceFile, getObjectProperty(config, 'header'))
				const label = `${relativePath}:${position.line + 1} ${method} ${id}${header ? ` / ${header}` : ''}`

				if (hasObjectProperty(config, 'size')) {
					failures.push(`${label} still uses size`)
				}
				if (hasMetaProperty(config, 'colClassName')) {
					failures.push(`${label} still uses meta.colClassName`)
				}
				if (!hasMetaProperty(config, 'headerClassName')) {
					failures.push(`${label} missing meta.headerClassName`)
				}
				ts.forEachChild(node, visit)
			}

			visit(sourceFile)
		}

		expect(failures).toEqual([])
	})
})

if (!existsSync(SRC_DIR)) {
	throw new Error(`Missing source directory: ${SRC_DIR}`)
}
