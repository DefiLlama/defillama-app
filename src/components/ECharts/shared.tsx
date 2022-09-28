import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import styled from 'styled-components'
import { useSelectState, SelectArrow, SelectItemCheck, SelectPopover, SelectItem } from 'ariakit/select'
import { Select } from '~/components/Filters'

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
	position: absolute;
	right: 0;
	top: -3px;
	padding: 4px;
	z-index: 1;
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

const StyledPopover = styled(SelectPopover)`
	position: relative;
	display: flex;
	flex-direction: column;
	margin: 0;
	outline: ${({ theme }) => '1px solid ' + theme.text5};
	min-width: 160px;
	max-height: 300px;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
	filter: ${({ theme }) =>
		theme.mode === 'dark'
			? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
			: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
	border-radius: 0;
	overflow: auto;
	overscroll-behavior: contain;
	z-index: 50;

	& > *:last-of-type {
		border-radius: 0;
	}
`

const Button = styled(Item)`
	white-space: nowrap;
	background: #2172e5;
	color: #fff;
	justify-content: center;

	:hover,
	&[data-focus-visible] {
		cursor: pointer;
		background: #4190ff;
	}
`

const DropdownValue = styled.span`
	max-width: 16ch;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
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
	// The scrollable element for your list
	const parentRef = React.useRef()

	const rowVirtualizer = useVirtualizer({
		count: allOptions.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 41
	})

	const onChange = (values) => {
		setOptions(values)
	}

	const select = useSelectState({
		value: options,
		setValue: onChange,
		defaultValue: allOptions,
		gutter: 6
	})

	const selectButtonRef = React.useRef(null)

	return (
		<>
			<Menu state={select} {...props}>
				{renderValue(select.value, title)}
				<SelectArrow />
			</Menu>
			{select.mounted && (
				<StyledPopover state={select} initialFocusRef={selectButtonRef}>
					{/* The scrollable element for your list */}
					<div
						ref={parentRef}
						style={{
							height: `400px`,
							overflow: 'auto' // Make it scroll!
						}}
					>
						{options.length > 0 ? (
							<Button onClick={() => select.setValue([])} ref={selectButtonRef} id="filter-button">
								Deselect All
							</Button>
						) : (
							<Button onClick={() => select.setValue(allOptions)} ref={selectButtonRef} id="filter-button">
								Select All
							</Button>
						)}

						{/* The large inner element to hold all of the items */}
						<div
							style={{
								height: `${rowVirtualizer.getTotalSize()}px`,
								width: '100%',
								position: 'relative'
							}}
						>
							{/* Only the visible items in the virtualizer, manually positioned to be in view */}
							{rowVirtualizer.getVirtualItems().map((virtualItem) => (
								<Item
									key={virtualItem.key}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										height: `${virtualItem.size}px`,
										transform: `translateY(${virtualItem.start}px)`
									}}
									value={allOptions[virtualItem.index]}
								>
									<SelectItemCheck />
									<DropdownValue>{allOptions[virtualItem.index]}</DropdownValue>
								</Item>
							))}
						</div>
					</div>
				</StyledPopover>
			)}
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
