import { MutableRefObject, useMemo, useState } from 'react'
import { useDebounce } from '~/hooks/useDebounce'
import { SelectItem } from 'ariakit/select'
import { Checkbox } from '~/components'
import { slug } from '~/utils'

interface ISelectContent {
	options: Array<string>
	selectedOptions: Array<string>
	pathname: string
	focusItemRef: MutableRefObject<any>
	variant?: 'primary' | 'secondary'
	isOptionToggled: (option: any) => boolean
	clearAllOptions: () => void
	toggleAllOptions: () => void
	selectOnlyOne: (options: string) => void
	isSlugValue?: boolean
}

interface IComboboxSelectContent extends ISelectContent {
	autoFocus?: boolean
	contentElementId?: string
}

const SelectContent = ({
	options,
	selectedOptions,
	variant = 'primary',
	focusItemRef,
	clearAllOptions,
	toggleAllOptions,
	isOptionToggled,
	selectOnlyOne,
	isSlugValue
}: ISelectContent) => {
	return (
		<>
			<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-white/40 dark:border-black/40">
				<button onClick={clearAllOptions} className="p-3">
					Clear
				</button>
				<button onClick={toggleAllOptions} className="p-3">
					Toggle all
				</button>
			</span>

			<div className="select-filteredOptions-wrapper">
				{options.map((value, i) => {
					const formattedValue = isSlugValue ? slug(value) : value

					return (
						<SelectItem
							value={formattedValue}
							key={formattedValue + i}
							ref={i === 0 && selectedOptions.length === options.length ? focusItemRef : null}
							focusOnHover
							className="group flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
						>
							<span>{value}</span>
							{selectOnlyOne ? (
								<button
									onClick={(e) => {
										e.stopPropagation()
										selectOnlyOne(formattedValue)
									}}
									className="font-medium text-xs text-[var(--link)] underline hidden group-hover:inline-block group-focus-visible:inline-block"
								>
									Only
								</button>
							) : null}

							<Checkbox checked={isOptionToggled(formattedValue)} />
						</SelectItem>
					)
				})}
			</div>
		</>
	)
}

export const ComboboxSelectContent = ({ autoFocus, options, contentElementId, ...props }: IComboboxSelectContent) => {
	const [inputValue, setInputValue] = useState('')

	const debouncedInputValue = useDebounce(inputValue, 300)

	const filteredOptions = useMemo(() => {
		if (debouncedInputValue.length > 0) {
			const searchValue = debouncedInputValue.toLowerCase()
			return options.filter((option) => option.toLowerCase().includes(searchValue))
		}
		return options
	}, [options, debouncedInputValue])

	return (
		<>
			<input
				className="combobox-input"
				onChange={(e) => setInputValue(e.target.value)}
				placeholder="Search..."
				role="combobox"
				autoFocus={autoFocus}
				aria-expanded={true}
				aria-haspopup="listbox"
				aria-controls={contentElementId}
			/>

			{filteredOptions.length > 0 ? (
				<>
					<SelectContent options={filteredOptions.slice(0, 100)} {...props} />
				</>
			) : (
				<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
			)}
		</>
	)
}
