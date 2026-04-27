import { useEffect, useRef, type FocusEvent } from 'react'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
// type="date" fires change with padded years (e.g. 0002) while the real year is still being typed. Keep in sync with TokenPnl min (epoch).
const MIN_PLAUSIBLE_YEAR = 1970

const isPlausibleIsoDate = (value: string): boolean => {
	if (!value) return false
	const match = ISO_DATE_PATTERN.exec(value)
	if (!match) return false
	return Number(match[1]) >= MIN_PLAUSIBLE_YEAR
}

export const DateInput = ({
	label,
	value,
	onChange,
	min,
	max,
	invalid
}: {
	label: string
	value: string
	onChange: (value: string) => void
	min?: string
	max?: string
	invalid?: boolean
}) => {
	const inputRef = useRef<HTMLInputElement>(null)
	const lastCommittedRef = useRef(value)

	// Uncontrolled defaultValue avoids React clobbering the browser date editor mid-edit; sync prop -> DOM when not focused.
	useEffect(() => {
		lastCommittedRef.current = value
		const node = inputRef.current
		if (!node) return
		if (node.value === value) return
		if (document.activeElement === node) return
		node.value = value
	}, [value])

	const tryCommit = (next: string) => {
		if (next === lastCommittedRef.current) return
		if (!isPlausibleIsoDate(next)) return
		onChange(next)
	}

	const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
		const next = event.target.value
		if (isPlausibleIsoDate(next)) {
			tryCommit(next)
			return
		}
		const node = inputRef.current
		if (node && node.value !== lastCommittedRef.current) {
			node.value = lastCommittedRef.current
		}
	}

	return (
		<label className="flex flex-col gap-1.5 text-sm">
			<span className="font-light text-(--text-secondary)">{label}</span>
			<input
				ref={inputRef}
				type="date"
				defaultValue={value}
				onChange={(event) => tryCommit(event.target.value)}
				onBlur={handleBlur}
				min={min}
				max={max}
				className={`cursor-pointer rounded-md border bg-(--bg-input) px-3 py-2.5 text-base text-black outline-0 transition-colors duration-200 focus:border-white/30 focus:ring-0 dark:text-white dark:scheme-dark ${invalid ? 'border-red-500' : 'border-(--form-control-border)'}`}
			/>
		</label>
	)
}
