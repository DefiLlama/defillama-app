import * as React from 'react'
import styled from 'styled-components'
import { useSelectState, SelectArrow } from 'ariakit/select'
import { Checkbox } from '~/components'
import { ComboboxSelectPopover, FilterFnsGroup, Select, SelectItem } from '~/components/Filters/common'
import { Input, List } from '~/components/Combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { useComboboxState } from 'ariakit/combobox'
import { useRouter } from 'next/router'

export const Item = styled(SelectItem)`
	padding: 12px 4px;
	display: flex;
	align-items: center;
	gap: 4px;
	cursor: pointer;

	:hover,
	&[data-focus-visible] {
		outline: none;
		background: ${({ theme }) => theme.bg3};
	}

	&:last-of-type {
		border-radius: 0 0 12px 12px;
	}
`

const Menu = styled(Select)`
	z-index: 1;
	position: absolute;
	right: 0;
	top: -3px;
	padding: 4px;
	width: min-content;
	border: ${({ theme }) => '1px solid ' + theme.bg4};
	border-radius: 8px;
	font-size: 0.75rem;

	& > * {
		display: flex;
		gap: 8px;
		align-items: center;
	}
`

const SelectedOptions = styled.span`
	background: ${({ theme }) => theme.bg4};
	padding: 4px;
	border-radius: 100px;
	min-width: 22px;
`

function renderValue(value: Array<string>, title: string) {
	return (
		<span>
			<SelectedOptions>{value?.length ?? 0}</SelectedOptions>
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
		animated: true,
		renderCallback
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const focusItemRef = React.useRef(null)

	return (
		<>
			<Menu state={select} {...props}>
				{renderValue(select.value, title)}
				<SelectArrow />
			</Menu>
			<ComboboxSelectPopover state={select} modal={!isLarge} composite={false} initialFocusRef={focusItemRef}>
				<Input state={combobox} placeholder="Search..." autoFocus />

				{combobox.matches.length > 0 ? (
					<>
						<FilterFnsGroup>
							<button onClick={() => select.setValue([])}>Clear</button>

							{router.pathname !== '/comparison' && (
								<button onClick={() => select.setValue(allOptions)}>Toggle all</button>
							)}
						</FilterFnsGroup>
						<List state={combobox} className="filter-by-list">
							{combobox.matches.map((value, i) => (
								<SelectItem
									value={value}
									key={value + i}
									ref={i === 0 && options.length === allOptions.length ? focusItemRef : null}
									focusOnHover
								>
									<span data-name>{value}</span>
									<Checkbox checked={select.value.includes(value) ? true : false} />
								</SelectItem>
							))}
						</List>
					</>
				) : (
					<p id="no-results">No results</p>
				)}
			</ComboboxSelectPopover>
		</>
	)
}

export const ProtocolChartWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 0 0 20px 0;
	min-height: 460px;
	grid-column: span 1;
`

export const YieldsChartWrapper = styled.div`
	position: relative;
	padding: 20px;
	border-radius: 12px;
	background: ${({ theme }) => theme.bg6};
	border: ${({ theme }) => '1px solid ' + theme.divider};
	box-shadow: ${({ theme }) => theme.shadowSm};
`
