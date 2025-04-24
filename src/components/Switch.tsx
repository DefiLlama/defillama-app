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
		<label className={`relative text-sm cursor-pointer flex items-center gap-1 flex-nowrap ${className ?? ''}`}>
			<input
				type="checkbox"
				value={value}
				checked={checked}
				onChange={onChange}
				className="peer absolute w-[1em] h-[1em] opacity-[0.00001]"
			/>
			<span
				className={`border ${
					checked
						? 'border-[rgba(31,103,210,0.50)] bg-[rgba(31,103,210,0.25)]'
						: 'border-[#E2E2E2] bg-[#E2E2E2] dark:bg-[#2A2C2E] dark:border-[#2A2C2E]'
				} rounded p-[2px] h-[18px] w-[34px]`}
			>
				{!checked ? (
					<span className="block h-3 w-3 bg-[#707A7A] rounded-[3px] flex-shrink-0 mr-auto"></span>
				) : (
					<span className="block h-3 w-3 bg-[var(--old-blue)] rounded-[3px] flex-shrink-0 ml-auto"></span>
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
				<span className="absolute top-0 right-0 bottom-0 left-0 flex items-center z-10 bg-white/80 dark:bg-black/80 rounded-md">
					<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
