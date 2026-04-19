import MonacoEditor, { loader } from '@monaco-editor/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import { registerSqlCompletions, type CompletionContext } from './completions'
import type { RegisteredTable } from './useTableRegistry'

loader.config({
	paths: {
		vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs'
	}
})

const LIGHT_THEME_ID = 'llama-sql-light'
const DARK_THEME_ID = 'llama-sql-dark'

export interface EditorHandle {
	revealLine: (line: number, column?: number) => void
	focus: () => void
	insertSnippet: (text: string) => void
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
			}
		}),
		[]
	)

	const handleBeforeMount = useCallback((monaco: any) => {
		monaco.editor.defineTheme(LIGHT_THEME_ID, llamaSqlLight)
		monaco.editor.defineTheme(DARK_THEME_ID, llamaSqlDark)
	}, [])

	const handleMount = useCallback(
		(editor: any, monaco: any) => {
			editorInstanceRef.current = editor
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun())

			const disposable = registerSqlCompletions(monaco, contextRef)
			editor.onDidDispose(() => {
				disposable.dispose()
				if (editorInstanceRef.current === editor) editorInstanceRef.current = null
			})
		},
		[onRun]
	)

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
