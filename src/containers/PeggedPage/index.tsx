import * as React from 'react'
import { FormattedName } from '~/components/FormattedName'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { Select, SelectItem, SelectPopover, useSelectState, SelectArrow } from 'ariakit/select'

interface IProps {
	options: string[]
	selectedChart: string
	onClick: (e: any) => void
}

export function ChartSelector({ options, selectedChart, onClick }: IProps) {
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		value: selectedChart,
		setValue: onClick,
		gutter: 8,
		animated: isLarge ? false : true,
		renderCallback
	})

	const onItemClick = (chartType: string) => {
		onClick(chartType)
	}

	return (
		<>
			<Select
				state={selectState}
				className="bg-[var(--btn2-bg)] hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative md:min-w-[120px] md:max-w-fit"
			>
				<FormattedName text={selectedChart} maxCharacters={20} fontSize={'16px'} fontWeight={600} />
				<SelectArrow />
			</Select>
			{selectState.mounted ? (
				<SelectPopover
					state={selectState}
					composite={false}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					{options.map((option) => (
						<SelectItem
							value={option}
							key={option}
							focusOnHover
							setValueOnClick={false}
							onClick={() => onItemClick(option)}
							className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
						>
							{option}
						</SelectItem>
					))}
				</SelectPopover>
			) : null}
		</>
	)
}
