import * as React from 'react'
import { Parser } from 'expr-eval'
import { Icon } from '~/components/Icon'
import { protocolsByChainTableColumns } from '~/components/Table/Defi/Protocols'

interface CustomColumn {
	id: string
	name: string
	expression: string
	isValid: boolean
	errorMessage?: string
}

interface CustomColumnPanelProps {
	customColumns: CustomColumn[]
	onAddCustomColumn: (column: CustomColumn) => void
	onRemoveCustomColumn: (columnId: string) => void
	onUpdateCustomColumn: (columnId: string, updates: Partial<CustomColumn>) => void
}

export function CustomColumnPanel({
	customColumns,
	onAddCustomColumn,
	onRemoveCustomColumn,
	onUpdateCustomColumn
}: CustomColumnPanelProps) {
	const [newColumnName, setNewColumnName] = React.useState('')
	const [newColumnExpression, setNewColumnExpression] = React.useState('')
	const [validationError, setValidationError] = React.useState('')
	const [liveValidation, setLiveValidation] = React.useState<{ isValid: boolean; error?: string; result?: number }>({
		isValid: true
	})

	// Autocomplete state
	const [showAutocomplete, setShowAutocomplete] = React.useState(false)
	const [autocompleteIndex, setAutocompleteIndex] = React.useState(-1)
	const [cursorPosition, setCursorPosition] = React.useState(0)
	const [autocompleteFilter, setAutocompleteFilter] = React.useState('')
	const inputRef = React.useRef<HTMLInputElement>(null)

	const availableVariables = React.useMemo(() => {
		return protocolsByChainTableColumns
			.filter((col) => col.key !== 'name' && col.key !== 'category')
			.map((col) => ({
				key: col.key,
				name: col.name,
				description: `Use as: ${col.key}`
			}))
	}, [])

	// Autocomplete suggestions data structure
	const autocompleteSuggestions = React.useMemo(() => {
		const suggestions = [
			// Variables
			...availableVariables.map((variable) => ({
				type: 'variable' as const,
				value: variable.key,
				display: variable.key,
				description: variable.name,
				category: 'Variables'
			})),
			// Operators
			{ type: 'operator' as const, value: ' + ', display: '+', description: 'Addition', category: 'Operators' },
			{ type: 'operator' as const, value: ' - ', display: '-', description: 'Subtraction', category: 'Operators' },
			{ type: 'operator' as const, value: ' * ', display: '*', description: 'Multiplication', category: 'Operators' },
			{ type: 'operator' as const, value: ' / ', display: '/', description: 'Division', category: 'Operators' },
			{ type: 'operator' as const, value: ' % ', display: '%', description: 'Modulo', category: 'Operators' },
			{ type: 'operator' as const, value: ' ^ ', display: '^', description: 'Exponentiation', category: 'Operators' },
			// Functions
			{
				type: 'function' as const,
				value: 'abs(',
				display: 'abs()',
				description: 'Absolute value',
				category: 'Functions'
			},
			{
				type: 'function' as const,
				value: 'sqrt(',
				display: 'sqrt()',
				description: 'Square root',
				category: 'Functions'
			},
			{
				type: 'function' as const,
				value: 'pow(',
				display: 'pow(x, y)',
				description: 'Power function',
				category: 'Functions'
			},
			{
				type: 'function' as const,
				value: 'max(',
				display: 'max()',
				description: 'Maximum value',
				category: 'Functions'
			},
			{
				type: 'function' as const,
				value: 'min(',
				display: 'min()',
				description: 'Minimum value',
				category: 'Functions'
			},
			{
				type: 'function' as const,
				value: 'round(',
				display: 'round()',
				description: 'Round to nearest integer',
				category: 'Functions'
			},
			{
				type: 'function' as const,
				value: 'floor(',
				display: 'floor()',
				description: 'Round down',
				category: 'Functions'
			},
			{ type: 'function' as const, value: 'ceil(', display: 'ceil()', description: 'Round up', category: 'Functions' },
			// Parentheses
			{
				type: 'operator' as const,
				value: '(',
				display: '(',
				description: 'Opening parenthesis',
				category: 'Operators'
			},
			{ type: 'operator' as const, value: ')', display: ')', description: 'Closing parenthesis', category: 'Operators' }
		]
		return suggestions
	}, [availableVariables])

	// Sample data for live preview
	const sampleData = React.useMemo(() => {
		const sample: Record<string, number> = {}
		availableVariables.forEach((variable) => {
			// Create realistic sample data
			switch (variable.key) {
				case 'tvl':
					sample[variable.key] = 1500000000 // 1.5B
					break
				case 'mcap':
					sample[variable.key] = 2000000000 // 2B
					break
				case 'fees_24h':
					sample[variable.key] = 250000 // 250K
					break
				case 'fees_7d':
					sample[variable.key] = 1750000 // 1.75M
					break
				case 'revenue_24h':
					sample[variable.key] = 150000 // 150K
					break
				case 'revenue_7d':
					sample[variable.key] = 1050000 // 1.05M
					break
				case 'volume_24h':
					sample[variable.key] = 50000000 // 50M
					break
				case 'volume_7d':
					sample[variable.key] = 350000000 // 350M
					break
				case 'change_1d':
					sample[variable.key] = 5.2
					break
				case 'change_7d':
					sample[variable.key] = -12.8
					break
				default:
					// Generate realistic random numbers based on the variable name
					if (variable.key.includes('tvl') || variable.key.includes('mcap')) {
						sample[variable.key] = Math.floor(Math.random() * 5000000000) // Up to 5B
					} else if (variable.key.includes('volume')) {
						sample[variable.key] = Math.floor(Math.random() * 100000000) // Up to 100M
					} else if (variable.key.includes('fees') || variable.key.includes('revenue')) {
						sample[variable.key] = Math.floor(Math.random() * 2000000) // Up to 2M
					} else if (variable.key.includes('change')) {
						sample[variable.key] = (Math.random() - 0.5) * 40 // -20% to +20%
					} else {
						sample[variable.key] = Math.floor(Math.random() * 1000000) // Default up to 1M
					}
			}
		})
		return sample
	}, [availableVariables])

	const validateExpression = (expression: string): { isValid: boolean; error?: string } => {
		if (!expression.trim()) {
			return { isValid: false, error: 'Expression cannot be empty' }
		}

		try {
			const parser = new Parser()
			const expr = parser.parse(expression)

			// Test with dummy data to catch variable issues
			const testData: Record<string, number> = {}
			availableVariables.forEach((variable) => {
				testData[variable.key] = 100
			})

			expr.evaluate(testData)
			return { isValid: true }
		} catch (error) {
			return { isValid: false, error: error.message || 'Invalid expression' }
		}
	}

	const handleAddColumn = () => {
		if (!newColumnName.trim()) {
			setValidationError('Column name is required')
			return
		}

		const validation = validateExpression(newColumnExpression)
		if (!validation.isValid) {
			setValidationError(validation.error || 'Invalid expression')
			return
		}

		const newColumn: CustomColumn = {
			id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
			name: newColumnName.trim(),
			expression: newColumnExpression.trim(),
			isValid: true
		}

		onAddCustomColumn(newColumn)
		setNewColumnName('')
		setNewColumnExpression('')
		setValidationError('')
	}

	// Filter autocomplete suggestions based on current input
	const filteredSuggestions = React.useMemo(() => {
		if (!autocompleteFilter.trim()) return autocompleteSuggestions

		const filter = autocompleteFilter.toLowerCase()
		return autocompleteSuggestions.filter(
			(suggestion) =>
				suggestion.display.toLowerCase().includes(filter) ||
				suggestion.description.toLowerCase().includes(filter) ||
				suggestion.value.toLowerCase().includes(filter)
		)
	}, [autocompleteSuggestions, autocompleteFilter])

	const insertVariable = (variableKey: string) => {
		setNewColumnExpression((prev) => prev + variableKey)
		setShowAutocomplete(false)
		setAutocompleteIndex(-1)
	}

	const insertOperator = (operator: string) => {
		setNewColumnExpression((prev) => prev + ` ${operator} `)
		setShowAutocomplete(false)
		setAutocompleteIndex(-1)
	}

	// Insert suggestion at cursor position
	const insertSuggestion = (suggestion: (typeof autocompleteSuggestions)[0]) => {
		if (!inputRef.current) return

		const input = inputRef.current
		const start = input.selectionStart || 0
		const end = input.selectionEnd || 0
		const value = input.value

		// Find the start of the current word being typed
		let wordStart = start
		while (wordStart > 0 && /[a-zA-Z0-9_]/.test(value[wordStart - 1])) {
			wordStart--
		}

		const newValue = value.slice(0, wordStart) + suggestion.value + value.slice(end)
		setNewColumnExpression(newValue)

		// Set cursor position after inserted text
		setTimeout(() => {
			const newPosition = wordStart + suggestion.value.length
			input.setSelectionRange(newPosition, newPosition)
			input.focus()
		}, 0)

		setShowAutocomplete(false)
		setAutocompleteIndex(-1)
		setAutocompleteFilter('')
	}

	// Handle input changes and autocomplete triggering
	const handleExpressionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		const cursorPos = e.target.selectionStart || 0

		setNewColumnExpression(newValue)
		setCursorPosition(cursorPos)

		// Extract current word being typed for autocomplete
		let wordStart = cursorPos
		while (wordStart > 0 && /[a-zA-Z0-9_]/.test(newValue[wordStart - 1])) {
			wordStart--
		}

		const currentWord = newValue.slice(wordStart, cursorPos)

		// Show autocomplete if we're typing a word (at least 1 character)
		if (currentWord.length >= 1) {
			setAutocompleteFilter(currentWord)
			setShowAutocomplete(true)
			setAutocompleteIndex(-1)
		} else {
			setShowAutocomplete(false)
			setAutocompleteFilter('')
		}
	}

	// Handle keyboard navigation in autocomplete
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!showAutocomplete || filteredSuggestions.length === 0) {
			// Handle Ctrl+Space to trigger autocomplete manually
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

	// Live validation effect
	React.useEffect(() => {
		if (!newColumnExpression.trim()) {
			setLiveValidation({ isValid: true })
			return
		}

		try {
			const parser = new Parser()
			const expr = parser.parse(newColumnExpression)
			const result = expr.evaluate(sampleData)
			setLiveValidation({ isValid: true, result: typeof result === 'number' ? result : null })
		} catch (error) {
			setLiveValidation({ isValid: false, error: error.message || 'Invalid expression' })
		}
	}, [newColumnExpression, sampleData])

	// Format number for display
	const formatPreviewNumber = (value: number | null): string => {
		if (value === null || value === undefined) return '-'

		if (Math.abs(value) >= 1e9) {
			return `$${(value / 1e9).toFixed(2)}B`
		} else if (Math.abs(value) >= 1e6) {
			return `$${(value / 1e6).toFixed(2)}M`
		} else if (Math.abs(value) >= 1e3) {
			return `$${(value / 1e3).toFixed(2)}K`
		} else {
			return value.toFixed(2)
		}
	}

	const handleMouseDown = (e: React.MouseEvent) => {
		// Prevent drag events from bubbling up to dashboard
		e.stopPropagation()
	}

	const handleDragStart = (e: React.DragEvent) => {
		// Prevent any drag operations within the panel
		e.preventDefault()
		e.stopPropagation()
	}

	return (
		<div
			className="space-y-6"
			onMouseDown={handleMouseDown}
			onDragStart={handleDragStart}
			style={{ userSelect: 'none' }}
		>
			{/* Add New Custom Column */}
			<div className="pro-divider pro-bg2 border p-4">
				<h5 className="pro-text1 mb-3 text-sm font-medium">Create Custom Column</h5>

				<div className="space-y-3">
					<div>
						<label className="pro-text2 mb-1 block text-xs font-medium">Column Name</label>
						<input
							type="text"
							value={newColumnName}
							onChange={(e) => setNewColumnName(e.target.value)}
							placeholder="e.g., P/E Ratio, Custom Metric"
							className="pro-divider pro-text1 placeholder:pro-text3 pro-bg2 w-full border px-3 py-2 text-sm transition-colors focus:border-(--primary) focus:outline-hidden"
							onMouseDown={(e) => e.stopPropagation()}
							onDragStart={(e) => e.preventDefault()}
							draggable={false}
						/>
					</div>

					<div>
						<label className="pro-text2 mb-1 block text-xs font-medium">Expression</label>
						<div className="relative">
							<input
								ref={inputRef}
								type="text"
								value={newColumnExpression}
								onChange={handleExpressionChange}
								onKeyDown={handleKeyDown}
								onBlur={() => {
									// Delay hiding autocomplete to allow clicking on suggestions
									setTimeout(() => setShowAutocomplete(false), 150)
								}}
								placeholder="e.g., tvl / mcap, (fees_24h + revenue_24h) * 365, tvl * 0.1"
								className={`pro-text1 placeholder:pro-text3 pro-bg2 w-full border px-3 py-2 text-sm transition-colors focus:outline-hidden ${
									newColumnExpression && !liveValidation.isValid
										? 'border-red-500 focus:border-red-500'
										: newColumnExpression && liveValidation.isValid
											? 'border-green-500 focus:border-green-500'
											: 'pro-divider focus:border-(--primary)'
								}`}
								onMouseDown={(e) => e.stopPropagation()}
								onDragStart={(e) => e.preventDefault()}
								draggable={false}
							/>

							{/* Autocomplete dropdown */}
							{showAutocomplete && filteredSuggestions.length > 0 && (
								<div
									className="pro-bg2 pro-divider thin-scrollbar absolute z-50 mt-1 max-h-64 overflow-y-auto rounded-sm border shadow-lg"
									style={{
										width: '320px',
										minWidth: '280px',
										maxWidth: '400px'
									}}
									onMouseDown={(e) => e.stopPropagation()}
									onDragStart={(e) => e.preventDefault()}
									draggable={false}
								>
									{filteredSuggestions.map((suggestion, index) => (
										<div
											key={`${suggestion.type}-${suggestion.value}`}
											onClick={() => insertSuggestion(suggestion)}
											className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
												index === autocompleteIndex ? 'bg-(--primary) text-white' : 'pro-hover-bg pro-text1'
											}`}
											onMouseEnter={() => setAutocompleteIndex(index)}
										>
											<span
												className={`h-1 w-1 shrink-0 rounded-full ${
													suggestion.type === 'variable'
														? 'bg-blue-500'
														: suggestion.type === 'function'
															? 'bg-purple-500'
															: 'bg-gray-500'
												}`}
											/>
											<code className="min-w-0 shrink-0 font-mono text-sm">{suggestion.display}</code>
											<span className="pro-text3 ml-auto truncate text-xs">{suggestion.description}</span>
										</div>
									))}
									{filteredSuggestions.length === 0 && autocompleteFilter && (
										<div className="pro-text3 px-3 py-2 text-sm">No suggestions found for "{autocompleteFilter}"</div>
									)}
								</div>
							)}
							{/* Live validation indicator */}
							{newColumnExpression && (
								<div className="absolute top-1/2 right-2 -translate-y-1/2 transform">
									{liveValidation.isValid ? (
										<Icon name="check" height={16} width={16} className="text-green-500" />
									) : (
										<Icon name="x" height={16} width={16} className="text-red-500" />
									)}
								</div>
							)}
						</div>

						<p className="pro-text3 mt-1 text-xs">
							💡 Start typing to see autocomplete suggestions. Use ↑↓ to navigate, Enter/Tab to select, Esc to close, or
							Ctrl+Space to open.
						</p>

						{/* Live Preview */}
						{newColumnExpression && (
							<div
								className={`mt-2 rounded border p-2 text-xs ${
									liveValidation.isValid
										? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
										: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="pro-text2 font-medium">Live Preview:</span>
									{liveValidation.isValid ? (
										<span className="font-mono text-green-700 dark:text-green-300">
											{formatPreviewNumber(liveValidation.result || null)}
										</span>
									) : (
										<span className="text-red-700 dark:text-red-300">{liveValidation.error}</span>
									)}
								</div>
								{liveValidation.isValid && (
									<div className="pro-text3 mt-1 text-xs">
										Using sample data:{' '}
										{Object.entries(sampleData)
											.slice(0, 3)
											.map(([key, value]) => `${key}=${formatPreviewNumber(value)}`)
											.join(', ')}
										...
									</div>
								)}
							</div>
						)}

						{/* Quick Operator Buttons - Compact */}
						<div className="mt-2 flex flex-wrap gap-1">
							<span className="pro-text3 mr-2 text-xs">Quick operators:</span>
							{['+', '-', '*', '/', '(', ')'].map((operator) => (
								<button
									key={operator}
									type="button"
									onClick={() => insertOperator(operator)}
									className="pro-divider pro-hover-bg pro-text2 pro-bg2 border px-2 py-1 font-mono text-xs transition-colors"
									onMouseDown={(e) => e.stopPropagation()}
									onDragStart={(e) => e.preventDefault()}
									draggable={false}
								>
									{operator}
								</button>
							))}
						</div>
					</div>

					{validationError && (
						<div className="border border-red-200 bg-red-50 p-2 text-xs text-red-500 dark:border-red-800 dark:bg-red-900/20">
							{validationError}
						</div>
					)}

					<button
						onClick={handleAddColumn}
						disabled={!newColumnName.trim() || !newColumnExpression.trim()}
						className="bg-(--primary) px-3 py-1 text-sm text-white transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50"
					>
						Add Custom Column
					</button>
				</div>
			</div>

			{/* Available Variables Reference - Compact */}
			<div className="pro-divider pro-bg3 border p-3">
				<h5 className="pro-text2 mb-2 text-sm font-medium">Available Variables</h5>
				<p className="pro-text3 mb-2 text-xs">Click any variable to add it to your expression</p>
				<div className="thin-scrollbar grid max-h-32 grid-cols-3 gap-1 overflow-y-auto md:grid-cols-4 lg:grid-cols-6">
					{availableVariables.map((variable) => (
						<button
							key={variable.key}
							type="button"
							onClick={() => insertVariable(variable.key)}
							title={variable.name}
							className="pro-divider pro-hover-bg pro-bg2 rounded-sm border p-1 text-center text-xs transition-colors"
							onMouseDown={(e) => e.stopPropagation()}
							onDragStart={(e) => e.preventDefault()}
							draggable={false}
						>
							<code className="block truncate font-mono text-xs text-(--primary)">{variable.key}</code>
						</button>
					))}
				</div>
				<div className="pro-text3 mt-2 text-xs">
					Sample values:{' '}
					{Object.entries(sampleData)
						.slice(0, 4)
						.map(([key, value]) => `${key}=${formatPreviewNumber(value)}`)
						.join(', ')}
				</div>
			</div>

			{/* Existing Custom Columns - Read Only */}
			{customColumns.length > 0 && (
				<div className="space-y-3">
					<h5 className="pro-text2 text-sm font-medium">Custom Columns ({customColumns.length})</h5>
					{customColumns.map((column) => (
						<div key={column.id} className="pro-divider pro-bg3 border p-3">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<div className="mb-1 flex items-center gap-2">
										<span className="pro-text1 text-sm font-medium">{column.name}</span>
										{column.isValid ? (
											<Icon name="check" height={12} width={12} className="text-green-500" />
										) : (
											<Icon name="x" height={12} width={12} className="text-red-500" />
										)}
									</div>
									<div className="pro-text2 pro-bg2 pro-divider rounded-sm border px-2 py-1 font-mono text-xs">
										{column.expression}
									</div>
									{!column.isValid && column.errorMessage && (
										<p className="mt-1 text-xs text-red-500">{column.errorMessage}</p>
									)}
								</div>
								<button
									onClick={() => onRemoveCustomColumn(column.id)}
									className="pro-text3 ml-3 transition-colors hover:text-red-500"
									title="Delete custom column"
								>
									<Icon name="trash-2" height={14} width={14} />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Examples */}
			<div className="pro-divider pro-bg3 border p-4">
				<h5 className="pro-text2 mb-3 text-sm font-medium">Example Expressions</h5>
				<div className="space-y-2 text-xs">
					<div>
						<code className="font-mono text-(--primary)">(fees_24h + revenue_24h) * 365</code>
						<span className="pro-text3 ml-2">Annualized fees + revenue</span>
					</div>
					<div>
						<code className="font-mono text-(--primary)">volume_24h / tvl</code>
						<span className="pro-text3 ml-2">Volume to TVL ratio</span>
					</div>
					<div>
						<code className="font-mono text-(--primary)">(change_1d + change_7d) / 2</code>
						<span className="pro-text3 ml-2">Average price change</span>
					</div>
				</div>
			</div>
		</div>
	)
}
