interface IProps {
	selectedValue: string
	setValue: (period: string) => void
	values: Array<string>
	style?: Record<string, string>
}

export const TagGroup = ({ selectedValue, setValue, values, style }: IProps) => {
	return (
		<div
			className="flex items-center rounded-md h-full overflow-x-auto flex-nowrap w-fit border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296]"
			style={style}
		>
			{values.map((value) => {
				return (
					<button
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap font-medium text-sm hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
						data-active={value === selectedValue}
						key={value}
						onClick={() => setValue(value)}
					>
						{`${value.slice(0, 1).toUpperCase()}${value.slice(1)}`}
					</button>
				)
			})}
		</div>
	)
}
