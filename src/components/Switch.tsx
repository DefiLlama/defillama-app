import { QuestionHelper } from './QuestionHelper'

export const Switch = ({
	label,
	checked,
	onChange,
	value,
	className,
	help
}: {
	label: string
	checked: boolean
	onChange: () => void
	value: string
	className?: string
	help?: string
}) => {
	return (
		<label className={`text-sm cursor-pointer flex items-center gap-1 flex-nowrap ${className ?? ''}`}>
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
		</label>
	)
}
