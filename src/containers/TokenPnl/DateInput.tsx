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
	return (
		<label className="flex flex-col gap-1.5 text-sm">
			<span className="font-light text-(--text-secondary)">{label}</span>
			<input
				type="date"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				min={min}
				max={max}
				className={`cursor-pointer rounded-md border bg-(--bg-input) px-3 py-2.5 text-base text-black outline-0 transition-colors duration-200 focus:border-white/30 focus:ring-0 dark:text-white dark:[color-scheme:dark] ${invalid ? 'border-red-500' : 'border-(--form-control-border)'}`}
			/>
		</label>
	)
}
