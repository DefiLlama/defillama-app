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
		<label className="flex flex-col gap-1 text-sm">
			<span>{label}</span>
			<input
				type="date"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				min={min}
				max={max}
				className={`rounded-md border bg-white p-2 text-base text-black outline-0 dark:bg-black dark:text-white ${invalid ? 'border-red-500' : 'border-(--form-control-border)'}`}
			/>
		</label>
	)
}
