import { QuestionHelper } from './QuestionHelper'

export const Switch = ({
	label,
	checked,
	onChange,
	value,
	className,
	help,
	isLoading
}: {
	label: string
	checked: boolean
	onChange: () => void
	value: string
	className?: string
	help?: string
	isLoading?: boolean
}) => {
	return (
		<label className={`relative isolate flex cursor-pointer flex-nowrap items-center gap-1 text-sm ${className ?? ''}`}>
			<input
				type="checkbox"
				value={value}
				checked={checked}
				onChange={onChange}
				className="peer absolute h-[1em] w-[1em] opacity-[0.00001]"
			/>
			<span
				className={`border ${
					checked ? 'border-(--switch-border) bg-(--switch-bg)' : 'border-(--bg-input) bg-(--bg-input)'
				} h-4.5 w-[34px] rounded p-0.5`}
			>
				{!checked ? (
					<span className="mr-auto block h-3 w-3 shrink-0 rounded-[3px] bg-[#707A7A]"></span>
				) : (
					<span className="ml-auto block h-3 w-3 shrink-0 rounded-[3px] bg-(--old-blue)"></span>
				)}
			</span>
			{help ? (
				<span className="flex items-center gap-1">
					<span>{label}</span>
					<QuestionHelper text={help} />
				</span>
			) : (
				<span>{label}</span>
			)}

			{isLoading ? (
				<span className="absolute top-0 right-0 bottom-0 left-0 z-10 flex items-center rounded-md bg-white/80 dark:bg-black/80">
					<svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				</span>
			) : null}
		</label>
	)
}
