import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { evaluateFormula } from './formula.service'
import { formatValue } from '../../utils'
import { AVAILABLE_FIELDS, replaceAliases, AVAILABLE_FUNCTIONS } from './customColumnsUtils'
import { Icon } from '~/components/Icon'

interface CustomColumnModalProps {
	open: boolean
	onClose: () => void
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
	open,
	onClose,
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
	const modalRef = useRef<HTMLDivElement>(null)
	const [isMounted, setIsMounted] = useState(false)

	useEffect(() => {
		if (open) {
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
	}, [open, initialName, initialFormula, initialFormatType, initialDisplayAs])

	useEffect(() => {
		if (!open) return
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose()
			}
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [open, onClose])

	useEffect(() => {
		if (!open) return
		const handleClickOutside = (event: MouseEvent) => {
			if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
				onClose()
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [open, onClose])

	useEffect(() => {
		setIsMounted(true)
	}, [])

	if (!open || !isMounted) return null

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
			return { ...prev, formula: newFormula, showSuggestions: false }
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

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
			<div
				ref={modalRef}
				className="relative bg-[var(--cards-bg)] border border-[var(--divider)] rounded-xl p-6 shadow-xl max-w-md w-full"
			>
				<button
					onClick={onClose}
					className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--divider)] text-[var(--text3)] hover:text-[var(--text1)] transition-colors"
					aria-label="Close modal"
				>
					<Icon name="x" height={20} width={20} />
				</button>
				<h2 className="text-lg font-bold mb-4 text-[var(--text1)]">Add Custom Column</h2>
				<div className="mb-4">
					<label className="block mb-2 font-medium text-[var(--text2)]">Column Name</label>
					<input
						className="w-full py-3 px-4 text-sm rounded-lg bg-[var(--bg1)] border border-[var(--form-control-border)] text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--primary1)] focus:border-transparent"
						value={state.name}
						onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
						placeholder="Custom Column"
						autoFocus
					/>
				</div>
				<div className="mb-4">
					<label className="block mb-2 font-medium text-[var(--text2)]">Formula</label>
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
							className={`w-full py-3 px-4 text-sm rounded-lg bg-[var(--bg1)] border ${
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
				</div>
				<div className="mb-4">
					<label className="block mb-2 font-medium text-[var(--text2)]">Format</label>
					<select
						className="w-full py-3 px-4 text-sm rounded-lg bg-[var(--bg1)] border border-[var(--form-control-border)] text-[var(--text1)] focus:outline-none focus:ring-2 focus:ring-[var(--primary1)] focus:border-transparent"
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
				</div>
				<div className="mb-4 text-xs text-[var(--text2)]">
					<div className="mb-1 font-semibold">Available fields:</div>
					<ul className="list-disc ml-5 grid grid-cols-2 gap-x-4 gap-y-1 max-h-32 overflow-y-auto">
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
				<div className="flex justify-end gap-2 mt-4">
					<button
						className="px-4 py-2 rounded-lg bg-transparent hover:bg-[var(--btn-hover-bg)] text-[var(--text2)] transition-colors"
						onClick={onClose}
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
			</div>
		</div>,
		document.body
	)
}
