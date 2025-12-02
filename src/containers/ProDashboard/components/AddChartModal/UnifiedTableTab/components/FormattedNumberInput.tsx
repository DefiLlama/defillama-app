import { useEffect, useState } from 'react'

interface FormattedNumberInputProps {
	value: number | undefined
	onChange: (value: number | undefined) => void
	placeholder?: string
	min?: number
	prefix?: string
	className?: string
	error?: string
}

const parseNumberWithAbbreviation = (input: string): number | undefined => {
	const cleaned = input.trim().toLowerCase()
	if (!cleaned) return undefined
	const match = cleaned.match(/^(-?\d+\.?\d*)\s*([kmb])?$/)
	if (!match) return undefined

	const [, numStr, suffix] = match
	const base = parseFloat(numStr)
	if (Number.isNaN(base)) return undefined

	const multipliers: Record<string, number> = {
		k: 1_000,
		m: 1_000_000,
		b: 1_000_000_000
	}

	return suffix ? base * multipliers[suffix] : base
}

export function FormattedNumberInput({
	value,
	onChange,
	placeholder,
	min = 0,
	prefix = '',
	className = '',
	error
}: FormattedNumberInputProps) {
	const [displayValue, setDisplayValue] = useState('')
	const [isFocused, setIsFocused] = useState(false)

	useEffect(() => {
		if (!isFocused) {
			if (value === undefined || value === null) {
				setDisplayValue('')
			} else {
				setDisplayValue(value.toLocaleString())
			}
		}
	}, [value, isFocused])

	const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
		setIsFocused(true)
		if (value !== undefined && value !== null) {
			setDisplayValue(value.toString())
			setTimeout(() => event.target.select(), 0)
		}
	}

	const handleBlur = () => {
		setIsFocused(false)
		if (value === undefined || value === null) {
			setDisplayValue('')
		} else {
			setDisplayValue(value.toLocaleString())
		}
	}

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const input = event.target.value
		setDisplayValue(input)

		if (input === '' || input === '-') {
			onChange(undefined)
			return
		}

		const parsed = parseNumberWithAbbreviation(input)
		if (parsed !== undefined && parsed >= min) {
			onChange(parsed)
		}
	}

	return (
		<div className="relative flex-1">
			<div className="relative flex items-center">
				{prefix ? (
					<span className="pointer-events-none absolute left-3 text-sm text-(--text-secondary)">{prefix}</span>
				) : null}
				<input
					type="text"
					inputMode="decimal"
					value={displayValue}
					onChange={handleChange}
					onFocus={handleFocus}
					onBlur={handleBlur}
					placeholder={placeholder}
					className={`h-9 w-full rounded-md border px-3 text-sm transition outline-none ${prefix ? 'pl-6' : ''} ${
						error
							? 'border-red-500 focus:border-red-600'
							: 'border-(--cards-border) bg-(--cards-bg2) text-(--text-primary) focus:border-(--primary)'
					} ${className}`}
				/>
			</div>
			{error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
		</div>
	)
}
