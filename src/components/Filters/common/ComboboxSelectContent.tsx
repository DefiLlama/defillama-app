import { MutableRefObject, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useDebounce } from '~/hooks'
import { FilterFnsGroup, SelectItem } from './Base'
import { Checkbox } from '~/components'
import { slug } from '~/utils'

const LeftContainer = styled.div`
	display: flex;
	align-items: center;
`

const OnlyButton = styled.button`
	margin-left: 0.4rem;
	padding: 0;
	font-weight: 500;
	opacity: 0;
	transition: opacity 0.3s;

	:hover {
		text-decoration: underline;
	}
`

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
			<FilterFnsGroup data-variant={variant}>
				<button onClick={clearAllOptions}>Clear</button>

				<button onClick={toggleAllOptions}>Select all</button>
			</FilterFnsGroup>

			<div className="select-filteredOptions-wrapper">
				{options.map((value, i) => {
					const formattedValue = isSlugValue ? slug(value) : value

					return (
						<SelectItem
							value={formattedValue}
							key={formattedValue + i}
							ref={i === 0 && selectedOptions.length === options.length ? focusItemRef : null}
							focusOnHover
						>
							<LeftContainer>
								<span data-name>{value}</span>
								<OnlyButton
									onClick={(e) => {
										e.stopPropagation()
										selectOnlyOne(formattedValue)
									}}
								>
									Only
								</OnlyButton>
							</LeftContainer>
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
				<p id="no-results">No results</p>
			)}
		</>
	)
}
