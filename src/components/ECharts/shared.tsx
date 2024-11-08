import * as React from 'react'
import { useSelectState, SelectArrow, SelectPopover, Select, SelectItem } from 'ariakit/select'
import { Checkbox } from '~/components'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { Combobox, ComboboxList, useComboboxState } from 'ariakit/combobox'
import { useRouter } from 'next/router'

function renderValue(value: Array<string>, title: string) {
	return (
		<span className="flex items-center gap-1">
			<span className="text-[10px] rounded-full min-w-4 flex items-center justify-center bg-[var(--bg4)] px-[1px]">
				{value?.length ?? 0}
			</span>
			<span>{title}</span>
		</span>
	)
}

interface ISelectLegendMultipleProps {
	allOptions: Array<string>
	options: Array<string>
	setOptions: React.Dispatch<React.SetStateAction<Array<string>>>
	title: string
}

export function SelectLegendMultiple({ allOptions, options, setOptions, title, ...props }: ISelectLegendMultipleProps) {
	const router = useRouter()

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const combobox = useComboboxState({ list: allOptions })
	const { value, setValue, ...selectProps } = combobox

	const onChange = (values) => {
		setOptions(values)
	}

	const select = useSelectState({
		...selectProps,
		value: options,
		setValue: onChange,
		gutter: 6,
		animated: isLarge ? false : true,
		renderCallback
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const focusItemRef = React.useRef(null)

	return (
		<>
			<Select
				state={select}
				{...props}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer text-[var(--text1)] flex-nowrap ml-auto"
			>
				{renderValue(select.value, title)}
				<SelectArrow />
			</Select>
			{select.mounted ? (
				<SelectPopover
					state={select}
					composite={false}
					initialFocusRef={focusItemRef}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					<Combobox
						state={combobox}
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md py-2 px-3 m-3 mb-0"
					/>

					{combobox.matches.length > 0 ? (
						<>
							<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-black/10 dark:border-white/10">
								<button onClick={() => select.setValue([])} className="p-3">
									Clear
								</button>
								{router.pathname !== '/comparison' && (
									<button onClick={() => select.setValue(allOptions)} className="p-3">
										Toggle all
									</button>
								)}
							</span>
							<ComboboxList state={combobox} className="flex flex-col overflow-auto overscroll-contain text-xs">
								{combobox.matches.map((value, i) => (
									<SelectItem
										value={value}
										key={value + i}
										ref={i === 0 && options.length === allOptions.length ? focusItemRef : null}
										focusOnHover
										className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
									>
										<span>{value}</span>
										<Checkbox checked={select.value.includes(value) ? true : false} />
									</SelectItem>
								))}
							</ComboboxList>
						</>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</SelectPopover>
			) : null}
		</>
	)
}
