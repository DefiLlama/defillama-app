import { darken, transparentize } from 'polished'
import { capitalize } from 'lodash'

interface IProps {
	selectedValue: string
	setValue: (period: string) => void
	values: Array<string>
	style?: Record<string, string>
}

const RowFilter = ({ selectedValue, setValue, values, style }: IProps) => {
	return (
		<div
			style={
				{
					'--bg-light': transparentize(0.9, '#2172E5'),
					'--bg-dark': transparentize(0.9, '#629ff4'),
					'--hover-bg-light': transparentize(0.8, '#2172E5'),
					'--hover-bg-dark': transparentize(0.8, '#629ff4'),
					'--hover-active-bg': darken(0.1, '#2172E5'),
					...style
				} as any
			}
			className="flex items-center rounded-lg h-full overflow-x-auto flex-nowrap"
		>
			{values.map((value) => {
				return (
					<button
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap font-medium text-sm text-[#1F1F1F] dark:text-[#FAFAFA] bg-[var(--bg-light)] dark:bg-[var(--bg-dark)] hover:bg-[var(--hover-bg-light)] hover:dark:bg-[var(--hover-bg-dark)] data-[active=true]:bg-[#2172e5] data-[active=true]:text-white hover:data-[active=true]:bg-[var(--hover-active-bg)] first:rounded-l-lg last:rounded-r-lg"
						data-active={value === selectedValue}
						key={value}
						onClick={() => setValue(value)}
					>
						{capitalize(value)}
					</button>
				)
			})}
		</div>
	)
}

export default RowFilter
