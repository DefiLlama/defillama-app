import MonacoEditor, { loader } from '@monaco-editor/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import type { ChartConfig } from '../chartConfig'
import { ErrorBanner, replaceIdentifier } from '../ErrorBanner'
import { ResultsPanel } from '../ResultsPanel'
import type { NotebookCell, ResultsView } from '../useSqlTabs'
import type { RegisteredTable } from '../useTableRegistry'

loader.config({
	paths: {
		vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs'
	}
})

const LIGHT_THEME_ID = 'llama-sql-light'
const DARK_THEME_ID = 'llama-sql-dark'

export interface SqlCellHandle {
	focus: () => void
	revealLine: (line: number, column?: number) => void
}

interface SqlCellProps {
	cell: NotebookCell
	loadedTables: RegisteredTable[]
	onSourceChange: (next: string) => void
	onRun: () => void
	onRunAndAdvance: () => void
	onFocus: () => void
	onChartConfigChange: (next: ChartConfig | null) => void
	onPreferredViewChange: (view: ResultsView | undefined) => void
}

export const SqlCell = forwardRef<SqlCellHandle, SqlCellProps>(function SqlCell(
	{ cell, loadedTables, onSourceChange, onRun, onRunAndAdvance, onFocus, onChartConfigChange, onPreferredViewChange },
	ref
) {
	const [theme, setTheme] = useState<string>(() => computeTheme())
	const editorInstanceRef = useRef<any>(null)

	const onRunRef = useRef(onRun)
	const onRunAndAdvanceRef = useRef(onRunAndAdvance)
	useEffect(() => {
		onRunRef.current = onRun
		onRunAndAdvanceRef.current = onRunAndAdvance
	}, [onRun, onRunAndAdvance])

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
			focus: () => editorInstanceRef.current?.focus(),
			revealLine: (line: number, column?: number) => {
				const editor = editorInstanceRef.current
				if (!editor) return
				editor.revealLineInCenter(line)
				editor.setPosition({ lineNumber: line, column: column ?? 1 })
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
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current())
			editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => onRunAndAdvanceRef.current())
			editor.onDidFocusEditorWidget(() => onFocus())
			editor.onDidDispose(() => {
				if (editorInstanceRef.current === editor) editorInstanceRef.current = null
			})
		},
		[onFocus]
	)

	const lineCount = Math.max(cell.source.split('\n').length, 3)
	const editorHeight = Math.min(Math.max(lineCount * 18 + 20, 80), 420)

	return (
		<div className="flex flex-col gap-2">
			<div className="overflow-hidden rounded-md border border-(--divider) bg-(--cards-bg)">
				<MonacoEditor
					height={`${editorHeight}px`}
					language="sql"
					theme={theme}
					value={cell.source}
					onChange={(v) => onSourceChange(v ?? '')}
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
						padding: { top: 8, bottom: 8 },
						lineNumbers: 'on',
						lineDecorationsWidth: 6,
						lineNumbersMinChars: 3,
						fontLigatures: true,
						fontFamily:
							"'JetBrains Mono', 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
						quickSuggestions: { other: true, comments: false, strings: false },
						suggestOnTriggerCharacters: true,
						wordBasedSuggestions: 'currentDocument',
						acceptSuggestionOnEnter: 'on',
						tabCompletion: 'on',
						smoothScrolling: true,
						fixedOverflowWidgets: true,
						scrollbar: { vertical: 'auto', alwaysConsumeMouseWheel: false },
						guides: { indentation: false, highlightActiveIndentation: false }
					}}
				/>
			</div>

			{cell.runError ? (
				<ErrorBanner
					error={cell.runError}
					loadedTables={loadedTables}
					density="compact"
					onJump={(line, column) => {
						const editor = editorInstanceRef.current
						if (!editor) return
						editor.revealLineInCenter(line)
						editor.setPosition({ lineNumber: line, column: column ?? 1 })
						editor.focus()
					}}
					onApplyFix={(oldId, newId) => onSourceChange(replaceIdentifier(cell.source, oldId, newId))}
				/>
			) : null}

			<ResultsPanel
				result={cell.result}
				running={cell.running}
				busyLabel={cell.loadingStage}
				chartConfig={cell.chartConfig}
				onChartConfigChange={onChartConfigChange}
				preferredView={cell.preferredView}
				onConsumePreferredView={() => onPreferredViewChange(undefined)}
				durationMs={cell.lastRun?.durationMs ?? null}
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
