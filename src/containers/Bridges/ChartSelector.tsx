import * as React from 'react'
import { FormattedName } from '~/components/FormattedName'
import * as Ariakit from '@ariakit/react'

interface IProps {
	options: string[]
	selectedChart: string
	onClick: (e: any) => void
}

export function ChartSelector({ options, selectedChart, onClick }: IProps) {
	const onItemClick = (chartType: string) => {
		onClick(chartType)
	}

	return (
		<Ariakit.SelectProvider value={selectedChart} setValue={onClick}>
			<Ariakit.Select
				className={`bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer text-[var(--text1)] flex-nowrap`}
			>
				<FormattedName text={selectedChart} maxCharacters={20} fontSize={'16px'} fontWeight={600} />
				<Ariakit.SelectArrow />
			</Ariakit.Select>

			<Ariakit.SelectPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				wrapperProps={{
					className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
				}}
				className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				{options.map((option) => (
					<Ariakit.SelectItem
						value={option}
						key={option}
						focusOnHover
						setValueOnClick={false}
						onClick={() => onItemClick(option)}
						className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
					>
						{option}
					</Ariakit.SelectItem>
				))}
			</Ariakit.SelectPopover>
		</Ariakit.SelectProvider>
	)
}
