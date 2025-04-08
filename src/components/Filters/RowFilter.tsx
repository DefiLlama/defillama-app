interface IProps {
	selectedValue: string
	setValue: (period: string) => void
	values: Array<string>
	style?: Record<string, string>
}

export const RowFilter = ({ selectedValue, setValue, values, style }: IProps) => {
	return (
		<div className="flex items-center rounded-lg h-full overflow-x-auto flex-nowrap w-fit" style={style}>
			{values.map((value) => {
				return (
					<button
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap font-medium text-sm text-black dark:text-white bg-[var(--link-bg)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--link-active-bg)] data-[active=true]:text-white"
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
