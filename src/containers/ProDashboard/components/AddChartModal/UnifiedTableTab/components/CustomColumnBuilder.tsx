import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import {
	evaluateExpression,
	formatPreviewNumber,
	generateCustomColumnId,
	getAvailableVariables,
	getDefaultAggregation,
	getExpressionVariables,
	SAMPLE_METRICS,
	validateExpression
} from '~/containers/ProDashboard/components/UnifiedTable/utils/customColumns'
import type { CustomColumnDefinition } from '~/containers/ProDashboard/types'

interface CustomColumnBuilderProps {
	customColumns: CustomColumnDefinition[]
	onAdd: (column: CustomColumnDefinition) => void
	onRemove: (id: string) => void
	onUpdate: (id: string, updates: Partial<CustomColumnDefinition>) => void
}

type ColumnFormat = CustomColumnDefinition['format']
type ColumnAggregation = CustomColumnDefinition['aggregation']

const FORMAT_OPTIONS: Array<{ id: ColumnFormat; label: string; description: string }> = [
	{ id: 'usd', label: '$', description: 'Currency' },
	{ id: 'percent', label: '%', description: 'Percent' },
	{ id: 'ratio', label: 'x', description: 'Ratio' },
	{ id: 'number', label: '#', description: 'Number' }
]

const AGGREGATION_OPTIONS: Array<{ id: ColumnAggregation; label: string; description: string }> = [
	{ id: 'recalculate', label: 'Recalc', description: 'Re-evaluate expression on aggregated metrics (best for ratios)' },
	{ id: 'sum', label: 'Sum', description: 'Sum individual row values (best for totals like fees * 365)' },
	{ id: 'first', label: 'First', description: 'Use first row value only' },
	{ id: 'none', label: 'None', description: 'Show dash (-) for grouped rows' }
]

const EXAMPLE_PRESETS = [
	{
		name: 'TVL/MCap',
		expression: 'tvl / mcap',
		format: 'ratio' as ColumnFormat,
		description: 'TVL to Market Cap ratio'
	},
	{
		name: 'Annualized Fees',
		expression: 'fees24h * 365',
		format: 'usd' as ColumnFormat,
		description: 'Projected yearly fees'
	},
	{
		name: 'Fee Yield',
		expression: '(fees24h * 365) / tvl * 100',
		format: 'percent' as ColumnFormat,
		description: 'Annual fee yield'
	},
	{
		name: 'P/F Ratio',
		expression: 'mcap / (fees24h * 365)',
		format: 'ratio' as ColumnFormat,
		description: 'Price to Fees'
	},
	{
		name: 'Revenue Margin',
		expression: 'revenue24h / fees24h * 100',
		format: 'percent' as ColumnFormat,
		description: 'Revenue as % of fees'
	}
]

interface AutocompleteSuggestion {
	type: 'variable' | 'operator' | 'function'
	value: string
	display: string
	description: string
	category: string
}

export function CustomColumnBuilder({ customColumns, onAdd, onRemove, onUpdate }: CustomColumnBuilderProps) {
	const [name, setName] = useState('')
	const [expression, setExpression] = useState('')
	const [format, setFormat] = useState<ColumnFormat>('number')
	const [aggregation, setAggregation] = useState<ColumnAggregation>('recalculate')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [showAutocomplete, setShowAutocomplete] = useState(false)
	const [autocompleteIndex, setAutocompleteIndex] = useState(-1)
	const [autocompleteFilter, setAutocompleteFilter] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	const aggregationTouchedRef = useRef(false)

	const availableVariables = useMemo(() => getAvailableVariables(), [])

	const autocompleteSuggestions = useMemo<AutocompleteSuggestion[]>(() => {
		const suggestions: AutocompleteSuggestion[] = [
			...availableVariables.map((variable) => ({
				type: 'variable' as const,
				value: variable.key,
				display: variable.key,
				description: variable.name,
				category: variable.group
			})),
			{ type: 'operator', value: ' + ', display: '+', description: 'Addition', category: 'Operators' },
			{ type: 'operator', value: ' - ', display: '-', description: 'Subtraction', category: 'Operators' },
			{ type: 'operator', value: ' * ', display: '*', description: 'Multiplication', category: 'Operators' },
			{ type: 'operator', value: ' / ', display: '/', description: 'Division', category: 'Operators' },
			{ type: 'operator', value: ' ^ ', display: '^', description: 'Power', category: 'Operators' },
			{ type: 'function', value: 'abs(', display: 'abs()', description: 'Absolute value', category: 'Functions' },
			{ type: 'function', value: 'sqrt(', display: 'sqrt()', description: 'Square root', category: 'Functions' },
			{ type: 'function', value: 'max(', display: 'max(a,b)', description: 'Maximum', category: 'Functions' },
			{ type: 'function', value: 'min(', display: 'min(a,b)', description: 'Minimum', category: 'Functions' },
			{ type: 'function', value: 'round(', display: 'round()', description: 'Round', category: 'Functions' }
		]
		return suggestions
	}, [availableVariables])

	const filteredSuggestions = useMemo(() => {
		if (!autocompleteFilter.trim()) return autocompleteSuggestions.slice(0, 15)
		const filter = autocompleteFilter.toLowerCase()
		return autocompleteSuggestions
			.filter((s) => s.display.toLowerCase().includes(filter) || s.description.toLowerCase().includes(filter))
			.slice(0, 10)
	}, [autocompleteSuggestions, autocompleteFilter])

	const expressionValidation = useMemo(() => {
		if (!expression.trim()) {
			return { isValid: false, error: 'Expression is required' }
		}
		return validateExpression(expression)
	}, [expression])

	const validation = useMemo(() => {
		if (!name.trim()) {
			return { isValid: false, error: 'Name is required' }
		}
		const isDuplicate = customColumns.some(
			(col) => col.name.toLowerCase() === name.toLowerCase() && col.id !== editingId
		)
		if (isDuplicate) {
			return { isValid: false, error: 'Column name already exists' }
		}
		return expressionValidation
	}, [name, expressionValidation, customColumns, editingId])

	const preview = useMemo(() => {
		if (!expression.trim() || !expressionValidation.isValid) return null
		const result = evaluateExpression(expression, SAMPLE_METRICS)
		if (result === null) return null
		return formatPreviewNumber(result, format)
	}, [expression, expressionValidation.isValid, format])

	const usedVariables = useMemo(() => {
		if (!expression.trim() || !expressionValidation.isValid) return []
		const vars = getExpressionVariables(expression)
		const availableVarsMap = new Map(availableVariables.map((v) => [v.key, v]))
		return vars
			.filter((v) => v in SAMPLE_METRICS)
			.map((v) => {
				const meta = availableVarsMap.get(v)
				const value = SAMPLE_METRICS[v as keyof typeof SAMPLE_METRICS]
				return {
					key: v,
					name: meta?.name ?? v,
					value,
					formatted: formatPreviewNumber(value, meta?.format ?? 'number')
				}
			})
	}, [expression, expressionValidation.isValid, availableVariables])

	useEffect(() => {
		if (expression && expressionValidation.isValid && !editingId && !aggregationTouchedRef.current) {
			const suggestedAggregation = getDefaultAggregation(expression)
			setAggregation(suggestedAggregation)
		}
	}, [expression, expressionValidation.isValid, editingId])

	const insertSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
		if (!inputRef.current) return

		const input = inputRef.current
		const start = input.selectionStart || 0
		const end = input.selectionEnd || 0
		const value = input.value

		let wordStart = start
		while (wordStart > 0 && /[a-zA-Z0-9_]/.test(value[wordStart - 1])) {
			wordStart--
		}

		const newValue = value.slice(0, wordStart) + suggestion.value + value.slice(end)
		setExpression(newValue)

		setTimeout(() => {
			const newPosition = wordStart + suggestion.value.length
			input.setSelectionRange(newPosition, newPosition)
			input.focus()
		}, 0)

		setShowAutocomplete(false)
		setAutocompleteIndex(-1)
		setAutocompleteFilter('')
	}, [])

	const handleExpressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		const cursorPos = e.target.selectionStart || 0

		setExpression(newValue)

		let wordStart = cursorPos
		while (wordStart > 0 && /[a-zA-Z0-9_]/.test(newValue[wordStart - 1])) {
			wordStart--
		}

		const currentWord = newValue.slice(wordStart, cursorPos)

		if (currentWord.length >= 1) {
			setAutocompleteFilter(currentWord)
			setShowAutocomplete(true)
			setAutocompleteIndex(-1)
		} else {
			setShowAutocomplete(false)
			setAutocompleteFilter('')
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!showAutocomplete || filteredSuggestions.length === 0) {
			if (e.ctrlKey && e.code === 'Space') {
				e.preventDefault()
				setShowAutocomplete(true)
				setAutocompleteFilter('')
				setAutocompleteIndex(-1)
			}
			return
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				setAutocompleteIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0))
				break
			case 'ArrowUp':
				e.preventDefault()
				setAutocompleteIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1))
				break
			case 'Enter':
			case 'Tab':
				if (autocompleteIndex >= 0) {
					e.preventDefault()
					insertSuggestion(filteredSuggestions[autocompleteIndex])
				}
				break
			case 'Escape':
				e.preventDefault()
				setShowAutocomplete(false)
				setAutocompleteIndex(-1)
				break
		}
	}

	const handleAdd = useCallback(() => {
		if (!validation.isValid) return

		const column: CustomColumnDefinition = {
			id: editingId ?? generateCustomColumnId(),
			name: name.trim(),
			expression: expression.trim(),
			format,
			aggregation
		}

		if (editingId) {
			onUpdate(editingId, {
				name: column.name,
				expression: column.expression,
				format: column.format,
				aggregation: column.aggregation
			})
			setEditingId(null)
		} else {
			onAdd(column)
		}

		aggregationTouchedRef.current = false
		setName('')
		setExpression('')
		setFormat('number')
		setAggregation('recalculate')
	}, [validation.isValid, name, expression, format, aggregation, editingId, onAdd, onUpdate])

	const handleApplyPreset = useCallback((preset: (typeof EXAMPLE_PRESETS)[0]) => {
		aggregationTouchedRef.current = false
		setName(preset.name)
		setExpression(preset.expression)
		setFormat(preset.format)
		setAggregation(getDefaultAggregation(preset.expression))
	}, [])

	const handleEdit = useCallback((col: CustomColumnDefinition) => {
		setName(col.name)
		setExpression(col.expression)
		setFormat(col.format)
		setAggregation(col.aggregation)
		setEditingId(col.id)
	}, [])

	const handleCancelEdit = useCallback(() => {
		aggregationTouchedRef.current = false
		setName('')
		setExpression('')
		setFormat('number')
		setAggregation('recalculate')
		setEditingId(null)
	}, [])

	useEffect(() => {
		const handleClickOutside = () => setShowAutocomplete(false)
		document.addEventListener('click', handleClickOutside)
		return () => document.removeEventListener('click', handleClickOutside)
	}, [])

	const aggregationLabel = AGGREGATION_OPTIONS.find((a) => a.id === aggregation)?.label ?? aggregation

	return (
		<div className="space-y-4">
			<div className="pro-border rounded-md border bg-(--cards-bg) p-4">
				<div className="mb-3 flex items-center justify-between">
					<h5 className="pro-text1 text-sm font-medium">{editingId ? 'Edit Column' : 'Create Custom Column'}</h5>
					{editingId && (
						<button type="button" onClick={handleCancelEdit} className="pro-text3 text-xs hover:text-(--primary)">
							Cancel
						</button>
					)}
				</div>

				<div className="space-y-3">
					<div>
						<label className="pro-text2 mb-1 block text-xs font-medium">Column Name</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., P/E Ratio, Fee Yield"
							className="pro-border pro-text1 placeholder:pro-text3 w-full rounded-md border bg-(--bg-glass) px-3 py-2 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
						/>
					</div>

					<div>
						<label className="pro-text2 mb-1 block text-xs font-medium">Expression</label>
						<div className="relative" onClick={(e) => e.stopPropagation()}>
							<input
								ref={inputRef}
								type="text"
								value={expression}
								onChange={handleExpressionChange}
								onKeyDown={handleKeyDown}
								onFocus={() => expression && setShowAutocomplete(true)}
								placeholder="e.g., tvl / mcap, fees24h * 365"
								className={`pro-text1 placeholder:pro-text3 w-full rounded-md border bg-(--bg-glass) px-3 py-2 pr-8 font-mono text-sm transition-colors focus:outline-hidden ${
									expression && !expressionValidation.isValid
										? 'border-red-500 focus:border-red-500'
										: expression && expressionValidation.isValid
											? 'border-green-500 focus:border-green-500'
											: 'pro-border focus:border-(--primary)'
								}`}
							/>
							{expression && (
								<div className="absolute top-1/2 right-2 -translate-y-1/2">
									{expressionValidation.isValid ? (
										<Icon name="check" height={14} width={14} className="text-green-500" />
									) : (
										<Icon name="x" height={14} width={14} className="text-red-500" />
									)}
								</div>
							)}

							{showAutocomplete && filteredSuggestions.length > 0 && (
								<div className="thin-scrollbar absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-(--cards-border) bg-(--cards-bg) shadow-lg">
									{filteredSuggestions.map((suggestion, index) => (
										<div
											key={`${suggestion.type}-${suggestion.value}`}
											onClick={() => insertSuggestion(suggestion)}
											onMouseEnter={() => setAutocompleteIndex(index)}
											className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
												index === autocompleteIndex ? 'bg-(--primary) text-white' : 'pro-hover-bg pro-text1'
											}`}
										>
											<span
												className={`h-1.5 w-1.5 shrink-0 rounded-full ${
													suggestion.type === 'variable'
														? 'bg-blue-400'
														: suggestion.type === 'function'
															? 'bg-purple-400'
															: 'bg-gray-400'
												}`}
											/>
											<code className="shrink-0 text-xs">{suggestion.display}</code>
											<span className="pro-text3 ml-auto truncate text-xs">{suggestion.description}</span>
										</div>
									))}
								</div>
							)}
						</div>
						<p className="pro-text3 mt-1 text-[10px]">
							Type to autocomplete · Ctrl+Space to show all · ↑↓ to navigate · Enter to select
						</p>
					</div>

					<div className="flex gap-3">
						<div className="w-[140px] shrink-0">
							<label className="pro-text2 mb-1 block text-xs font-medium">Format</label>
							<div className="flex gap-1">
								{FORMAT_OPTIONS.map((opt) => (
									<Tooltip key={opt.id} content={opt.description} placement="bottom" className="flex-1">
										<button
											type="button"
											onClick={() => setFormat(opt.id)}
											className={`pro-border w-full rounded-md border px-1.5 py-1.5 text-xs font-medium transition-colors ${
												format === opt.id
													? 'border-(--primary) bg-(--primary)/15 text-(--primary)'
													: 'pro-hover-bg pro-text2'
											}`}
										>
											{opt.label}
										</button>
									</Tooltip>
								))}
							</div>
						</div>

						<div className="flex-1">
							<label className="pro-text2 mb-1 block text-xs font-medium">
								Aggregation
								<span className="pro-text3 ml-1 font-normal">(grouped rows)</span>
							</label>
							<div className="flex gap-1">
								{AGGREGATION_OPTIONS.map((opt) => (
									<Tooltip key={opt.id} content={opt.description} placement="bottom" className="flex-1">
										<button
											type="button"
											onClick={() => {
												aggregationTouchedRef.current = true
												setAggregation(opt.id)
											}}
											className={`pro-border w-full rounded-md border px-1.5 py-1.5 text-xs font-medium transition-colors ${
												aggregation === opt.id
													? 'border-(--primary) bg-(--primary)/15 text-(--primary)'
													: 'pro-hover-bg pro-text2'
											}`}
										>
											{opt.label}
										</button>
									</Tooltip>
								))}
							</div>
						</div>
					</div>

					{expression && (
						<div
							className={`rounded-md border text-xs ${
								expressionValidation.isValid
									? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
									: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
							}`}
						>
							<div className="flex items-center justify-between p-2">
								<span className="pro-text2 font-medium">Result:</span>
								{preview !== null ? (
									<span className="font-mono text-base font-semibold text-green-700 dark:text-green-300">
										{preview}
									</span>
								) : (
									<span className="text-red-700 dark:text-red-300">{expressionValidation.error || 'Invalid'}</span>
								)}
							</div>
							{usedVariables.length > 0 && (
								<div className="border-t border-green-200 px-2 py-1.5 dark:border-green-800">
									<div className="mb-1 text-[10px] font-medium text-green-800/70 dark:text-green-300/70">
										Sample values used:
									</div>
									<div className="flex flex-wrap gap-x-3 gap-y-0.5">
										{usedVariables.map((v) => (
											<div key={v.key} className="flex items-center gap-1">
												<code className="text-[10px] text-green-800/80 dark:text-green-300/80">{v.key}</code>
												<span className="text-[10px] text-green-700/60 dark:text-green-400/60">=</span>
												<span className="font-mono text-[10px] font-medium text-green-700 dark:text-green-300">
													{v.formatted}
												</span>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					)}

					<button
						type="button"
						onClick={handleAdd}
						disabled={!validation.isValid}
						className="w-full rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50"
					>
						{editingId ? 'Update Column' : 'Add Custom Column'}
					</button>
				</div>
			</div>

			<div className="pro-border rounded-md border bg-(--cards-bg) p-3">
				<h5 className="pro-text2 mb-2 text-xs font-medium">Example Presets</h5>
				<div className="flex flex-wrap gap-1.5">
					{EXAMPLE_PRESETS.map((preset) => (
						<button
							key={preset.name}
							type="button"
							onClick={() => handleApplyPreset(preset)}
							title={`${preset.expression} — ${preset.description}`}
							className="pro-border pro-hover-bg rounded-md border px-2 py-1 text-xs transition-colors"
						>
							<span className="pro-text1">{preset.name}</span>
						</button>
					))}
				</div>
			</div>

			{customColumns.length > 0 && (
				<div className="space-y-2">
					<h5 className="pro-text2 text-xs font-medium">Custom Columns ({customColumns.length})</h5>
					{customColumns.map((col) => (
						<div
							key={col.id}
							className={`pro-border flex items-center justify-between rounded-md border p-3 ${
								editingId === col.id ? 'border-(--primary) bg-(--primary)/5' : 'bg-(--cards-bg)'
							}`}
						>
							<div className="min-w-0 flex-1">
								<div className="mb-1 flex items-center gap-2">
									<span className="pro-text1 text-sm font-medium">{col.name}</span>
									<span className="pro-border rounded-md border bg-(--bg-glass) px-1.5 py-0.5 text-[10px] font-medium uppercase">
										{col.format}
									</span>
									<span className="pro-border rounded-md border bg-(--bg-glass) px-1.5 py-0.5 text-[10px] font-medium text-(--text-tertiary)">
										{AGGREGATION_OPTIONS.find((a) => a.id === col.aggregation)?.label ?? col.aggregation}
									</span>
								</div>
								<code className="pro-text3 block truncate text-xs">{col.expression}</code>
							</div>
							<div className="ml-3 flex shrink-0 items-center gap-1">
								<button
									type="button"
									onClick={() => handleEdit(col)}
									className="pro-text3 rounded-md p-1.5 transition-colors hover:bg-(--cards-bg-alt) hover:text-(--primary)"
									title="Edit"
								>
									<Icon name="pencil" height={14} width={14} />
								</button>
								<button
									type="button"
									onClick={() => onRemove(col.id)}
									className="pro-text3 rounded-md p-1.5 transition-colors hover:bg-red-500/10 hover:text-red-500"
									title="Delete"
								>
									<Icon name="trash-2" height={14} width={14} />
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
