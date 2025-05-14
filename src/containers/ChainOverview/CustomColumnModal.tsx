import React, { useState, useRef } from 'react'
import * as Ariakit from '@ariakit/react'
import { evaluateFormula } from './formula.service'
import { formatValue } from '../../utils'
import { AVAILABLE_FIELDS, replaceAliases, AVAILABLE_FUNCTIONS } from './customColumnsUtils'
import { Icon } from '~/components/Icon'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useIsClient } from '~/hooks'

interface CustomColumnModalProps {
	dialogStore: Ariakit.DialogStore
	onSave: (def: { name: string; formula: string; formatType: string }) => void
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
	React.useEffect(() => {
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
		onSave({ name: state.name.trim(), formula: state.formula.trim(), formatType: state.formatType })
	}

	let preview = null
	let hasFormulaError = false
	if (state.formula.trim()) {
		const formulaWithPaths = replaceAliases(state.formula)
		const result = evaluateFormula(formulaWithPaths, sampleRow)
		if (result.error) {
			hasFormulaError = true
		} else if (state.formatType === 'boolean' && typeof result.value === 'boolean') {
			preview = result.value ? '✅ True' : '❌ False'
		} else {
			preview = formatValue(result.value, state.formatType)
		}
	}

	return (
		<>
			<Ariakit.DialogProvider store={dialogStore}>
				<Ariakit.Dialog className="dialog gap-3" unmountOnHide>
					<Ariakit.DialogDismiss
						onClick={dialogStore.toggle}
						className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--divider)] text-[var(--text3)] hover:text-[var(--text1)] transition-colors"
						aria-label="Close modal"
					>
						<Icon name="x" height={20} width={20} />
					</Ariakit.DialogDismiss>
					<Ariakit.DialogHeading className="text-lg font-bold mb-4">Add Custom Column</Ariakit.DialogHeading>
					<label className="flex flex-col gap-1">
						<span>Column Name</span>
						<input
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-[var(--form-control-border)]"
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
								<div className="mb-2 flex items-center gap-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded px-3 py-2 text-sm font-semibold">
									<Icon name="help-circle" height={18} width={18} />
									<span>{state.fieldWarning}</span>
								</div>
							)}
							{state.error && (
								<div className="mb-2 flex items-center gap-2 bg-red-100 border border-red-400 text-red-700 rounded px-3 py-2 text-sm font-semibold">
									<Icon name="alert-triangle" height={18} width={18} />
									<span>{state.error}</span>
								</div>
							)}
							<input
								ref={inputRef}
								className={`w-full p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border ${
									state.error ? 'border-red-400' : 'border-[var(--form-control-border)]'
								} text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--primary1)] focus:border-transparent`}
								value={state.formula}
								onChange={handleFormulaChange}
								onKeyDown={handleKeyDown}
								placeholder="e.g. revenue_30d / tvl"
								autoComplete="off"
							/>
							{state.showSuggestions && (
								<ul className="absolute left-0 right-0 bg-[var(--cards-bg)] border border-[var(--divider)] rounded-lg shadow z-10 max-h-40 overflow-y-auto mt-1">
									{state.suggestions.map((s, i) => (
										<li
											key={s.name || s}
											className={`px-3 py-2 cursor-pointer text-[var(--text1)] flex items-center gap-2 ${
												i === state.highlighted ? 'bg-[var(--primary1-hover)]' : ''
											}`}
											onMouseDown={(e) => {
												e.stopPropagation()
												handleSuggestionClick(s)
											}}
										>
											{s.type === 'function' || s.type === 'operator' ? (
												<span className="text-[var(--primary1)]">ƒ</span>
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
						<select
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-[var(--form-control-border)]"
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
					</label>
					<div className="flex flex-col gap-1">
						<p>Available fields:</p>
						<ul className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-32 overflow-y-auto bg-white dark:bg-black rounded-md p-2 border border-[var(--form-control-border)]">
							{AVAILABLE_FIELDS.map((f) => (
								<li key={f}>
									<code
										className="bg-[var(--bg1)] px-1 py-0.5 rounded text-[var(--primary1)] cursor-pointer hover:bg-[var(--divider)]"
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
							<span className="font-semibold text-[var(--text2)]">Preview: </span>
							<span className="bg-[var(--bg1)] px-2 py-1 rounded text-[var(--text1)]">{preview}</span>
						</div>
					)}
					<div className="text-sm text-[var(--text2)]">
						<a
							href="https://docs.llama.fi/analysts/custom-columns"
							target="_blank"
							className="text-[var(--primary1)] hover:underline"
							rel="noreferrer"
						>
							Learn more on how to create custom columns
						</a>
					</div>
					<div className="flex justify-end gap-2 mt-4">
						<button
							className="px-4 py-2 rounded-lg bg-transparent hover:bg-[var(--btn-hover-bg)] text-[var(--text2)] transition-colors"
							onClick={dialogStore.toggle}
						>
							Cancel
						</button>
						<button
							className="px-4 py-2 rounded-lg bg-[var(--primary1)] hover:bg-[var(--primary1-hover)] text-white shadow-md transition-colors"
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
