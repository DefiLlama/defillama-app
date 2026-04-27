import MonacoEditor, { loader } from '@monaco-editor/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import { registerSqlCompletions, registerSqlHovers, type CompletionContext } from './completions'
import type { RegisteredTable } from './useTableRegistry'

loader.config({
	paths: {
		vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs'
	}
})

const LIGHT_THEME_ID = 'llama-sql-light'
const DARK_THEME_ID = 'llama-sql-dark'

const ACTIVE_STMT_STYLE_ID = 'llama-sql-active-stmt-style'
const ACTIVE_STMT_CLASS = 'llama-sql-active-stmt'
const ACTIVE_STMT_GUTTER_CLASS = 'llama-sql-active-stmt-gutter'

function ensureActiveStmtStyles() {
	if (typeof document === 'undefined') return
	if (document.getElementById(ACTIVE_STMT_STYLE_ID)) return
	const style = document.createElement('style')
	style.id = ACTIVE_STMT_STYLE_ID
	style.textContent = `
.${ACTIVE_STMT_CLASS} { background-color: rgba(122, 162, 255, 0.10); border-radius: 2px; }
:root.light .${ACTIVE_STMT_CLASS}, [data-theme="light"] .${ACTIVE_STMT_CLASS} { background-color: rgba(29, 78, 216, 0.07); }
.${ACTIVE_STMT_GUTTER_CLASS} { background-color: rgba(122, 162, 255, 0.55); width: 2px !important; margin-left: 2px; }
:root.light .${ACTIVE_STMT_GUTTER_CLASS}, [data-theme="light"] .${ACTIVE_STMT_GUTTER_CLASS} { background-color: rgba(29, 78, 216, 0.45); }
`
	document.head.appendChild(style)
}

export interface EditorHandle {
	revealLine: (line: number, column?: number) => void
	focus: () => void
	insertSnippet: (text: string) => void
	getSelection: () => string | null
	getStatementAtCursor: () => string | null
}

function collectStatementSemicolons(sql: string): number[] {
	const out: number[] = []
	let inSingle = false
	let inDouble = false
	let inLineComment = false
	let inBlockComment = false
	for (let i = 0; i < sql.length; i++) {
		const ch = sql[i]
		const next = sql[i + 1]
		if (inLineComment) {
			if (ch === '\n') inLineComment = false
			continue
		}
		if (inBlockComment) {
			if (ch === '*' && next === '/') {
				inBlockComment = false
				i++
			}
			continue
		}
		if (inSingle) {
			if (ch === "'") {
				if (next === "'") {
					i++
					continue
				}
				inSingle = false
			}
			continue
		}
		if (inDouble) {
			if (ch === '"') {
				if (next === '"') {
					i++
					continue
				}
				inDouble = false
			}
			continue
		}
		if (ch === '-' && next === '-') {
			inLineComment = true
			i++
			continue
		}
		if (ch === '/' && next === '*') {
			inBlockComment = true
			i++
			continue
		}
		if (ch === "'") {
			inSingle = true
			continue
		}
		if (ch === '"') {
			inDouble = true
			continue
		}
		if (ch === ';') out.push(i)
	}
	return out
}

function findStatementBoundsAtOffset(sql: string, offset: number): { start: number; end: number } {
	const semicolons = collectStatementSemicolons(sql)
	let stmtIdx = semicolons.length
	for (let i = 0; i < semicolons.length; i++) {
		if (offset <= semicolons[i]) {
			stmtIdx = i
			break
		}
	}
	let start = stmtIdx === 0 ? 0 : semicolons[stmtIdx - 1] + 1
	let end = stmtIdx < semicolons.length ? semicolons[stmtIdx] + 1 : sql.length
	if (stmtIdx > 0 && sql.slice(start, offset).trim().length === 0) {
		stmtIdx -= 1
		start = stmtIdx === 0 ? 0 : semicolons[stmtIdx - 1] + 1
		end = semicolons[stmtIdx] + 1
	}
	return { start, end }
}

interface EditorProps {
	value: string
	onChange: (next: string) => void
	onRun: () => void
	tables: RegisteredTable[]
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor({ value, onChange, onRun, tables }, ref) {
	const [theme, setTheme] = useState<string>(() => computeTheme())
	const editorInstanceRef = useRef<any>(null)

	const contextRef = useRef<CompletionContext>({ tables })
	useEffect(() => {
		contextRef.current = { tables }
	}, [tables])

	const onRunRef = useRef(onRun)
	useEffect(() => {
		onRunRef.current = onRun
	}, [onRun])

	useEffect(() => {
		const root = typeof document !== 'undefined' ? document.documentElement : null
		if (!root) return
		const observer = new MutationObserver(() => setTheme(computeTheme()))
		observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] })
		return () => observer.disconnect()
	}, [])

	useImperativeHandle(
		ref,
		() => ({
			revealLine: (line: number, column?: number) => {
				const editor = editorInstanceRef.current
				if (!editor) return
				editor.revealLineInCenter(line)
				editor.setPosition({ lineNumber: line, column: column ?? 1 })
				editor.focus()
			},
			focus: () => editorInstanceRef.current?.focus(),
			insertSnippet: (text: string) => {
				const editor = editorInstanceRef.current
				if (!editor) return
				const selection = editor.getSelection()
				const pos = selection ? null : editor.getPosition()
				const range =
					selection ??
					(pos
						? {
								startLineNumber: pos.lineNumber,
								startColumn: pos.column,
								endLineNumber: pos.lineNumber,
								endColumn: pos.column
							}
						: null)
				if (!range) return
				editor.executeEdits('schema-browser', [{ range, text, forceMoveMarkers: true }])
				editor.focus()
			},
			getSelection: () => {
				const editor = editorInstanceRef.current
				if (!editor) return null
				const selection = editor.getSelection()
				if (!selection || selection.isEmpty?.()) return null
				const model = editor.getModel?.()
				if (!model) return null
				const text = model.getValueInRange(selection)
				const trimmed = typeof text === 'string' ? text.trim() : ''
				return trimmed.length > 0 ? text : null
			},
			getStatementAtCursor: () => {
				const editor = editorInstanceRef.current
				if (!editor) return null
				const model = editor.getModel?.()
				const position = editor.getPosition?.()
				if (!model || !position) return null
				const sql = model.getValue()
				if (!sql) return null
				const offset = model.getOffsetAt(position)
				const { start, end } = findStatementBoundsAtOffset(sql, offset)
				const slice = sql.slice(start, end)
				return slice.trim().length > 0 ? slice : null
			}
		}),
		[]
	)

	const handleBeforeMount = useCallback((monaco: any) => {
		monaco.editor.defineTheme(LIGHT_THEME_ID, llamaSqlLight)
		monaco.editor.defineTheme(DARK_THEME_ID, llamaSqlDark)
	}, [])

	const handleMount = useCallback((editor: any, monaco: any) => {
		editorInstanceRef.current = editor
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current())

		const completions = registerSqlCompletions(monaco, contextRef)
		const hovers = registerSqlHovers(monaco, contextRef)

		ensureActiveStmtStyles()
		let decorationIds: string[] = []
		const updateActiveStmt = () => {
			const model = editor.getModel?.()
			const position = editor.getPosition?.()
			const selection = editor.getSelection?.()
			if (!model || !position) {
				decorationIds = editor.deltaDecorations(decorationIds, [])
				return
			}
			if (selection && !selection.isEmpty?.()) {
				decorationIds = editor.deltaDecorations(decorationIds, [])
				return
			}
			const sql = model.getValue() ?? ''
			if (!sql) {
				decorationIds = editor.deltaDecorations(decorationIds, [])
				return
			}
			const offset = model.getOffsetAt(position)
			let { start, end } = findStatementBoundsAtOffset(sql, offset)
			while (start < end && /\s/.test(sql[start])) start++
			while (end > start && /\s/.test(sql[end - 1])) end--
			if (start >= end) {
				decorationIds = editor.deltaDecorations(decorationIds, [])
				return
			}
			const startPos = model.getPositionAt(start)
			const endPos = model.getPositionAt(end)
			const range = new monaco.Range(
				startPos.lineNumber,
				startPos.column,
				endPos.lineNumber,
				endPos.column
			)
			decorationIds = editor.deltaDecorations(decorationIds, [
				{
					range,
					options: {
						className: ACTIVE_STMT_CLASS,
						linesDecorationsClassName: ACTIVE_STMT_GUTTER_CLASS,
						stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
					}
				}
			])
		}
		const cursorSub = editor.onDidChangeCursorPosition(updateActiveStmt)
		const selectionSub = editor.onDidChangeCursorSelection(updateActiveStmt)
		const contentSub = editor.onDidChangeModelContent(updateActiveStmt)
		updateActiveStmt()

		editor.onDidDispose(() => {
			cursorSub.dispose()
			selectionSub.dispose()
			contentSub.dispose()
			completions.dispose()
			hovers.dispose()
			if (editorInstanceRef.current === editor) editorInstanceRef.current = null
		})
	}, [])

	return (
		<div className="overflow-hidden rounded-[4px] border border-(--divider) bg-(--cards-bg)">
			<MonacoEditor
				height="44vh"
				language="sql"
				theme={theme}
				value={value}
				onChange={(v) => onChange(v ?? '')}
				beforeMount={handleBeforeMount}
				onMount={handleMount}
				loading={
					<div className="flex h-full items-center justify-center">
						<LoadingSpinner size={16} />
					</div>
				}
				options={{
					minimap: { enabled: false },
					fontSize: 13,
					tabSize: 2,
					wordWrap: 'on',
					scrollBeyondLastLine: false,
					automaticLayout: true,
					renderLineHighlight: 'line',
					padding: { top: 10, bottom: 10 },
					lineNumbers: 'on',
					lineDecorationsWidth: 8,
					lineNumbersMinChars: 3,
					fontLigatures: true,
					fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
					quickSuggestions: { other: true, comments: false, strings: false },
					suggestOnTriggerCharacters: true,
					wordBasedSuggestions: 'currentDocument',
					acceptSuggestionOnEnter: 'on',
					tabCompletion: 'on',
					smoothScrolling: true,
					fixedOverflowWidgets: true,
					cursorBlinking: 'phase',
					cursorSmoothCaretAnimation: 'on',
					guides: { indentation: false, highlightActiveIndentation: false }
				}}
			/>
		</div>
	)
})

function computeTheme(): string {
	if (typeof document === 'undefined') return DARK_THEME_ID
	const root = document.documentElement
	if (root.classList.contains('light')) return LIGHT_THEME_ID
	if (root.classList.contains('dark')) return DARK_THEME_ID
	if (root.getAttribute('data-theme') === 'light') return LIGHT_THEME_ID
	if (root.getAttribute('data-theme') === 'dark') return DARK_THEME_ID
	return DARK_THEME_ID
}

const llamaSqlDark = {
	base: 'vs-dark',
	inherit: true,
	rules: [
		{ token: '', foreground: 'e6e9ef' },
		{ token: 'keyword', foreground: '7aa2ff', fontStyle: 'bold' },
		{ token: 'keyword.sql', foreground: '7aa2ff', fontStyle: 'bold' },
		{ token: 'operator.sql', foreground: '7aa2ff' },
		{ token: 'predefined.sql', foreground: 'b794ff' },
		{ token: 'identifier', foreground: 'e6e9ef' },
		{ token: 'number', foreground: '9eddb2' },
		{ token: 'number.sql', foreground: '9eddb2' },
		{ token: 'string', foreground: 'f2c78d' },
		{ token: 'string.sql', foreground: 'f2c78d' },
		{ token: 'comment', foreground: '5a6580', fontStyle: 'italic' },
		{ token: 'delimiter', foreground: '8891ad' }
	],
	colors: {
		'editor.background': '#111824',
		'editor.foreground': '#e6e9ef',
		'editorLineNumber.foreground': '#3b445a',
		'editorLineNumber.activeForeground': '#7aa2ff',
		'editor.lineHighlightBackground': '#1a2130',
		'editor.lineHighlightBorder': '#1a2130',
		'editorCursor.foreground': '#7aa2ff',
		'editorIndentGuide.background1': '#1e2636',
		'editor.selectionBackground': '#2a3b66',
		'editor.inactiveSelectionBackground': '#1f2a45',
		'editorGutter.background': '#111824',
		'editorWidget.background': '#141c2a',
		'editorWidget.border': '#24304a',
		'editorSuggestWidget.background': '#141c2a',
		'editorSuggestWidget.border': '#24304a',
		'editorSuggestWidget.selectedBackground': '#1e2a44'
	}
}

const llamaSqlLight = {
	base: 'vs',
	inherit: true,
	rules: [
		{ token: '', foreground: '1d2430' },
		{ token: 'keyword', foreground: '1d4ed8', fontStyle: 'bold' },
		{ token: 'keyword.sql', foreground: '1d4ed8', fontStyle: 'bold' },
		{ token: 'operator.sql', foreground: '1d4ed8' },
		{ token: 'predefined.sql', foreground: '6b4bd2' },
		{ token: 'identifier', foreground: '1d2430' },
		{ token: 'number', foreground: '0f7a4a' },
		{ token: 'number.sql', foreground: '0f7a4a' },
		{ token: 'string', foreground: 'a35a1a' },
		{ token: 'string.sql', foreground: 'a35a1a' },
		{ token: 'comment', foreground: '7d8799', fontStyle: 'italic' },
		{ token: 'delimiter', foreground: '4a5468' }
	],
	colors: {
		'editor.background': '#ffffff',
		'editor.foreground': '#1d2430',
		'editorLineNumber.foreground': '#b6bcc9',
		'editorLineNumber.activeForeground': '#1d4ed8',
		'editor.lineHighlightBackground': '#f4f6fb',
		'editor.lineHighlightBorder': '#f4f6fb',
		'editorCursor.foreground': '#1d4ed8',
		'editorIndentGuide.background1': '#eef1f7',
		'editor.selectionBackground': '#cfdcff',
		'editor.inactiveSelectionBackground': '#e4ebfb'
	}
}
