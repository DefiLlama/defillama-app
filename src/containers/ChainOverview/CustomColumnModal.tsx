import { useEffect, useRef, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useIsClient } from '~/hooks'
import { useSubscribe } from '~/hooks/useSubscribe'
import { formatValue } from '../../utils'
import { AVAILABLE_FIELDS, AVAILABLE_FUNCTIONS, replaceAliases } from './customColumnsUtils'
import { evaluateFormula } from './formula.service'

interface CustomColumnModalProps {
	dialogStore: Ariakit.DialogStore
	onSave: (def: {
		name: string
		formula: string
		formatType: string
		determinedFormat?: 'number' | 'usd' | 'percent' | 'string' | 'boolean'
	}) => void
	sampleRow: any
	name?: string
	formula?: string
	formatType?: string
	displayAs?: string
}

function getFilteredSuggestions(word, beforeCursor) {
	const wordLower = word.toLowerCase()
	const functionMatches = AVAILABLE_FUNCTIONS.filter((f) => f.name.toLowerCase().startsWith(wordLower))
	const fieldMatches = AVAILABLE_FIELDS.filter((f) => f.toLowerCase().startsWith(wordLower))
	return [...fieldMatches.map((f) => ({ name: f, type: 'field' })), ...functionMatches]
}

export function CustomColumnModal({
	dialogStore,
	onSave,
	sampleRow,
	name: initialName = '',
	formula: initialFormula = '',
	formatType: initialFormatType = 'auto',
	displayAs: initialDisplayAs = 'auto'
}: CustomColumnModalProps) {
	const [state, setState] = useState({
		name: initialName,
		formula: initialFormula,
		formatType: initialFormatType,
		error: null,
		showSuggestions: false,
		suggestions: [],
		highlighted: 0,
		fieldWarning: null
	})
	const inputRef = useRef(null)
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const isClient = useIsClient()
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)

	const isOpen = Ariakit.useStoreState(dialogStore, 'open')
	useEffect(() => {
		if (isOpen) {
			setState({
				name: initialName,
				formula: initialFormula,
				formatType: initialFormatType,
				error: null,
				showSuggestions: false,
				suggestions: [],
				highlighted: 0,
				fieldWarning: null
			})
		}
	}, [isOpen, initialName, initialFormula, initialFormatType])

	const handleFormulaChange = (e) => {
		const value = e.target.value
		setState((prev) => ({ ...prev, formula: value }))
		const cursorPos = e.target.selectionStart
		const beforeCursor = value.slice(0, cursorPos)
		const match = beforeCursor.match(/([a-zA-Z0-9_]+)$/)
		const word = match ? match[1] : ''
		if (word) {
			const filtered = getFilteredSuggestions(word, beforeCursor)
			setState((prev) => ({
				...prev,
				suggestions: filtered,
				showSuggestions: filtered.length > 0,
				highlighted: 0,
				fieldWarning:
					word &&
					!AVAILABLE_FIELDS.some((f) => f.toLowerCase() === word.toLowerCase()) &&
					!AVAILABLE_FUNCTIONS.some((f) => f.name.toLowerCase() === word.toLowerCase()) &&
					isNaN(Number(word))
						? `Field or function '${word}' is not available.`
						: null
			}))
		} else {
			setState((prev) => ({ ...prev, showSuggestions: false, fieldWarning: null }))
		}
		if (value.trim()) {
			const formulaWithPaths = replaceAliases(value)
			const result = evaluateFormula(formulaWithPaths, sampleRow)
			if (result.error) {
				setState((prev) => ({ ...prev, error: 'Invalid formula: ' + result.error }))
			} else {
				setState((prev) => ({ ...prev, error: null }))
			}
		} else {
			setState((prev) => ({ ...prev, error: null }))
		}
	}

	const handleSuggestionClick = (item) => {
		if (typeof item === 'string') item = { name: item, type: 'field' }
		setState((prev) => {
			const input = inputRef.current
			let cursorPos = input ? input.selectionStart : prev.formula.length
			const beforeCursor = prev.formula.slice(0, cursorPos)
			const afterCursor = prev.formula.slice(cursorPos)
			const match = beforeCursor.match(/([a-zA-Z0-9_]+)$/)
			const word = match ? match[1] : ''
			const wordStart = match ? beforeCursor.length - word.length : beforeCursor.length
			let newFormula
			if (item.type === 'function' || item.type === 'operator') {
				newFormula = beforeCursor.slice(0, wordStart) + item.name + '()' + afterCursor
				setTimeout(() => {
					if (inputRef.current) {
						const pos = wordStart + item.name.length + 1
						inputRef.current.setSelectionRange(pos, pos)
					}
				}, 0)
			} else {
				newFormula = beforeCursor.slice(0, wordStart) + item.name + afterCursor
				setTimeout(() => {
					if (inputRef.current) {
						const pos = wordStart + item.name.length
						inputRef.current.setSelectionRange(pos, pos)
					}
				}, 0)
			}
			return { ...prev, formula: newFormula, showSuggestions: false, fieldWarning: null, error: null }
		})
		inputRef.current?.focus()
	}

	const handleKeyDown = (e) => {
		if (!state.showSuggestions) return
		if (e.key === 'ArrowDown') {
			setState((prev) => ({ ...prev, highlighted: Math.min(prev.highlighted + 1, prev.suggestions.length - 1) }))
			e.preventDefault()
		} else if (e.key === 'ArrowUp') {
			setState((prev) => ({ ...prev, highlighted: Math.max(prev.highlighted - 1, 0) }))
			e.preventDefault()
		} else if (e.key === 'Enter') {
			if (state.suggestions[state.highlighted]) {
				handleSuggestionClick(state.suggestions[state.highlighted])
				e.preventDefault()
			}
		} else if (e.key === 'Escape') {
			setState((prev) => ({ ...prev, showSuggestions: false }))
		}
	}

	const handleSave = () => {
		if (!state.name.trim() || !state.formula.trim()) {
			setState((prev) => ({ ...prev, error: 'Name and formula are required' }))
			return
		}
		const formulaWithPaths = replaceAliases(state.formula)
		const result = evaluateFormula(formulaWithPaths, sampleRow)
		if (result.error) {
			setState((prev) => ({ ...prev, error: 'Invalid formula: ' + result.error }))
			return
		}
		if (!isSubscriptionLoading && subscription?.status !== 'active') {
			setShowSubscribeModal(true)
			return
		}
		setState((prev) => ({ ...prev, error: null }))

		const determinedFormat =
			state.formatType === 'auto' && !result.error
				? (() => {
						if (typeof result.value === 'boolean') return 'boolean'
						if (typeof result.value === 'number') {
							if (result.value >= 0 && result.value <= 1) return 'percent'
							if (Math.abs(result.value) > 1000) return 'usd'
							return 'number'
						}
						return 'string'
					})()
				: undefined

		onSave({
			name: state.name.trim(),
			formula: state.formula.trim(),
			formatType: state.formatType,
			determinedFormat
		})
	}

	let preview = null
	let hasFormulaError = false
	if (state.formula.trim()) {
		const formulaWithPaths = replaceAliases(state.formula)
		const result = evaluateFormula(formulaWithPaths, sampleRow)
		if (result.error) {
			hasFormulaError = true
		} else {
			const determinedFormat =
				state.formatType === 'auto'
					? (() => {
							if (typeof result.value === 'boolean') return 'boolean'
							if (typeof result.value === 'number') {
								if (result.value >= 0 && result.value <= 1) return 'percent'
								if (Math.abs(result.value) > 1000) return 'usd'
								return 'number'
							}
							return 'string'
						})()
					: state.formatType

			if (determinedFormat === 'boolean' && typeof result.value === 'boolean') {
				preview = result.value ? '✅ True' : '❌ False'
			} else {
				preview = formatValue(result.value, determinedFormat)
			}
		}
	}

	return (
		<>
			<Ariakit.DialogProvider store={dialogStore}>
				<Ariakit.Dialog className="dialog gap-3" unmountOnHide>
					<Ariakit.DialogDismiss
						onClick={dialogStore.toggle}
						className="absolute top-3 right-3 rounded-lg p-1.5 text-(--text-tertiary) transition-colors hover:bg-(--divider) hover:text-(--text-primary)"
						aria-label="Close modal"
					>
						<Icon name="x" height={20} width={20} />
					</Ariakit.DialogDismiss>
					<Ariakit.DialogHeading className="mb-4 text-lg font-bold">Add Custom Column</Ariakit.DialogHeading>
					<label className="flex flex-col gap-1">
						<span>Column Name</span>
						<input
							className="rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
							value={state.name}
							onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
							placeholder="Custom Column"
							autoFocus
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span>Formula</span>
						<div className="relative">
							{state.fieldWarning && !state.error && (
								<div className="mb-2 flex items-center gap-2 rounded-sm border border-yellow-400 bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-700">
									<Icon name="help-circle" height={18} width={18} />
									<span>{state.fieldWarning}</span>
								</div>
							)}
							{state.error && (
								<div className="mb-2 flex items-center gap-2 rounded-sm border border-red-400 bg-red-100 px-3 py-2 text-sm font-semibold text-red-700">
									<Icon name="alert-triangle" height={18} width={18} />
									<span>{state.error}</span>
								</div>
							)}
							<input
								ref={inputRef}
								className={`w-full rounded-md border bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white ${
									state.error ? 'border-red-400' : 'border-(--form-control-border)'
								} text-(--text-primary) focus:border-transparent focus:ring-2 focus:ring-(--primary) focus:outline-hidden`}
								value={state.formula}
								onChange={handleFormulaChange}
								onKeyDown={handleKeyDown}
								placeholder="e.g. revenue_30d / tvl"
								autoComplete="off"
							/>
							{state.showSuggestions && (
								<ul className="absolute right-0 left-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-(--divider) bg-(--cards-bg) shadow-sm">
									{state.suggestions.map((s, i) => (
										<li
											key={s.name || s}
											className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-(--text-primary) ${
												i === state.highlighted ? 'bg-(--primary-hover)' : ''
											}`}
											onMouseDown={(e) => {
												e.stopPropagation()
												handleSuggestionClick(s)
											}}
										>
											{s.type === 'function' || s.type === 'operator' ? (
												<span className="text-(--primary)">ƒ</span>
											) : (
												''
											)}
											<span>{s.name || s}</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</label>
					<label className="flex flex-col gap-1">
						<span>Format</span>
						<div>
							<select
								className="w-full rounded-md border border-(--form-control-border) bg-white p-2 text-black disabled:opacity-50 dark:bg-black dark:text-white"
								value={state.formatType}
								onChange={(e) => setState((prev) => ({ ...prev, formatType: e.target.value }))}
							>
								<option value="auto">Auto</option>
								<option value="number">Number</option>
								<option value="usd">USD</option>
								<option value="percent">Percent</option>
								<option value="string">String</option>
								<option value="boolean">Boolean (checkmark)</option>
							</select>
							{state.formatType === 'auto' && state.formula.trim() && !hasFormulaError && (
								<div className="mt-1 text-sm text-(--text-secondary)">
									Auto will format as:{' '}
									{(() => {
										const formulaWithPaths = replaceAliases(state.formula)
										const result = evaluateFormula(formulaWithPaths, sampleRow)
										if (!result.error) {
											if (typeof result.value === 'boolean') return 'Boolean'
											if (typeof result.value === 'number') {
												if (result.value >= 0 && result.value <= 1) return 'Percent'
												if (Math.abs(result.value) > 1000) return 'USD'
												return 'Number'
											}
											return 'String'
										}
										return 'Unknown'
									})()}
								</div>
							)}
						</div>
					</label>
					<div className="flex flex-col gap-1">
						<p>Available fields:</p>
						<ul className="grid max-h-32 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto rounded-md border border-(--form-control-border) bg-white p-2 dark:bg-black">
							{AVAILABLE_FIELDS.map((f) => (
								<li key={f}>
									<code
										className="cursor-pointer rounded-sm bg-(--bg-main) px-1 py-0.5 text-(--primary) hover:bg-(--divider)"
										onClick={() => handleSuggestionClick({ name: f, type: 'field' })}
									>
										{f}
									</code>
								</li>
							))}
						</ul>
					</div>
					{state.formula.trim() && !hasFormulaError && (
						<div className="mb-2 text-sm">
							<span className="font-semibold text-(--text-secondary)">Preview: </span>
							<span className="rounded-sm bg-(--bg-main) px-2 py-1 text-(--text-primary)">{preview}</span>
						</div>
					)}
					<div className="text-sm text-(--text-secondary)">
						<a
							href="https://docs.llama.fi/analysts/custom-columns"
							target="_blank"
							className="text-(--primary) hover:underline"
							rel="noreferrer"
						>
							Learn more on how to create custom columns
						</a>
					</div>
					<div className="mt-4 flex justify-end gap-2">
						<button
							className="rounded-lg bg-transparent px-4 py-2 text-(--text-secondary) transition-colors hover:bg-(--btn-hover-bg)"
							onClick={dialogStore.toggle}
						>
							Cancel
						</button>
						<button
							className="rounded-lg bg-(--primary) px-4 py-2 text-white shadow-md transition-colors hover:bg-(--primary-hover)"
							onClick={handleSave}
						>
							Save
						</button>
					</div>
				</Ariakit.Dialog>
			</Ariakit.DialogProvider>
			{isClient && (
				<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
					<SubscribePlusCard context="modal" />
				</SubscribeModal>
			)}
		</>
	)
}
