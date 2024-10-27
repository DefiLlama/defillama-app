import { Select as AriaSelect, SelectItem as AriaSelectItem, SelectPopover as AriaSelectPopover } from 'ariakit/select'
import { transparentize } from 'polished'
import styled from 'styled-components'
import { Checkbox } from '~/components'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

export const Select = styled(AriaSelect)`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	background: ${({ theme }) => theme.bg6};
	color: ${({ theme }) => theme.text1};
	padding: 12px;
	border-radius: 12px;
	border: none;
	margin: 0;
	width: 200px;

	& > *:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:focus-visible,
	&[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
	}

	&[data-variant='secondary'] {
		background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		font-size: 0.75rem;

		:hover,
		:focus-visible,
		&[data-focus-visible] {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		}
	}
`

export const SelectPopover = styled(AriaSelectPopover)`
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-height: calc(100vh - 200px);
	min-width: 180px;
	font-size: 0.875rem;
	font-weight: 500;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg1};
	border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#40444f' : '#cbcbcb')};
	border-radius: 8px 8px 0 0;
	filter: ${({ theme }) =>
		theme.mode === 'dark'
			? 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 40%))'
			: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 15%))'};
	overflow: auto;
	overscroll-behavior: contain;
	outline: none !important;
	z-index: 10;

	opacity: 0;
	transform: translateY(100%);
	transition: 0.2s ease;

	&[data-enter] {
		transform: translateY(0%);
		opacity: 1;
	}

	&[data-leave] {
		transition: 0.1s ease;
	}

	#no-results {
		padding: 0 12px 8px;
		text-align: center;
	}

	&[data-variant='secondary'] {
		background: ${({ theme }) => (theme.mode === 'dark' ? '#222429' : '#f6f6f6')};
	}

	@media screen and (min-width: 640px) {
		max-height: 400px;
		font-size: 0.825rem;
		font-weight: 400;
		gap: 0px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};
		border-radius: 8px;
		transform: translateY(0%);

		&[data-variant='secondary'] {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#222429' : '#f6f6f6')};
		}
	}
`

export const SelectItem = styled(AriaSelectItem)`
	flex-shrink: 0;
	padding: 8px 12px;
	color: ${({ theme }) => theme.text1};
	cursor: pointer;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	background: none;
	border: none;
	text-align: start;
	display: flex;
	align-items: center;
	gap: 16px;

	& > *[data-name] {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	&:first-of-type {
		padding-top: 16px;
	}

	&:last-of-type {
		padding-bottom: 24px;
	}

	&:first-of-type,
	&:last-of-type {
		border-radius: 0;
	}

	:hover {
		button {
			opacity: 1;
		}
	}

	opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};

	@media screen and (min-width: 640px) {
		border-bottom: ${({ theme }) => '1px solid ' + transparentize(0.9, theme.text1)};

		:hover,
		:focus-visible,
		&[data-active-item] {
			outline: none;
			background-color: ${({ theme }) => transparentize(0.8, theme.primary1)};
		}

		&:first-of-type {
			padding-top: 12px;
		}

		&:last-of-type {
			padding-bottom: 12px;
			border: none;
		}
	}
`

export const ComboboxSelectPopover = styled(SelectPopover)`
	z-index: 10;
	height: 60vh;

	#no-results {
		margin: 24px 0;
	}

	.filter-by-list {
		padding: 0;
	}

	@media screen and (min-width: 640px) {
		height: unset;
		max-width: 300px;
	}
`

export const SelectButton = styled(AriaSelect)`
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 8px 12px;
	font-size: 0.825rem;
	border-radius: 8px;
	cursor: pointer;
	outline: none;
	border: 1px solid transparent;
	background-color: ${({ color, theme }) => transparentize(0.9, color || theme.primary1)};
	color: ${({ theme }) => theme.text1};

	white-space: nowrap;

	:hover,
	:focus-visible {
		background-color: ${({ color, theme }) => transparentize(0.8, color || theme.primary1)};
	}

	:focus-visible {
		outline: ${({ theme }) => '1px solid ' + theme.text1};
		outline-offset: 1px;
	}

	span:first-of-type {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	svg {
		position: relative;
		top: 1px;
	}

	&[data-variant='secondary'] {
		background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		font-size: 0.75rem;

		:hover,
		:focus-visible,
		&[data-focus-visible] {
			background: ${({ theme }) => (theme.mode === 'dark' ? '#22242a' : '#eaeaea')};
		}
	}
`

export const FilterFnsGroup = styled.span`
	position: sticky;
	top: 0;
	display: flex;
	justify-content: space-between;
	flex-wrap: wrap;
	padding: 12px;
	font-size: 0.75rem;
	background: ${({ theme }) => theme.bg1};
	border-bottom: ${({ theme }) => '1px solid ' + transparentize(0.9, theme.text1)};
	z-index: 1;

	button {
		padding: 4px 0;
		color: ${({ theme }) => theme.primary1};
	}

	&[data-variant='secondary'] {
		top: -8px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#222429' : '#f6f6f6')};
	}

	@media screen and (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		background: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#f4f6ff')};

		&[data-variant='secondary'] {
			top: 0px;
			background: ${({ theme }) => (theme.mode === 'dark' ? '#222429' : '#f6f6f6')};
		}
	}
`

export const ItemsSelected = styled.span`
	position: absolute;
	top: -8px;
	right: -8px;
	font-size: 10px;
	padding: 2px;
	min-width: 16px;
	background: ${({ theme }) => theme.bg4};
	border-radius: 9999px;
`

export const SecondaryLabel = styled.span`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	font-size: 0.75rem;

	& > *[data-selecteditems='true'] {
		color: ${({ theme }) => theme.link};
	}
`

export const SelectContent = ({ clearAllOptions, toggleAllOptions, variant, pathname, options, selectedOptions }) => {
	return (
		<>
			<FilterFnsGroup data-variant={variant}>
				<button onClick={clearAllOptions}>Clear</button>

				<button onClick={toggleAllOptions}>Toggle all</button>
			</FilterFnsGroup>
			{options.map((option) => (
				<SelectItem
					key={option.key}
					value={option.key}
					disabled={pathname ? option.disabledOnPages?.includes(pathname) ?? false : false}
				>
					{option.help ? (
						<Tooltip content={option.help}>
							<span>{option.name}</span>
							<Icon name="help-circle" height={15} width={15} />
						</Tooltip>
					) : (
						option.name
					)}
					<Checkbox
						checked={
							selectedOptions.includes(option.key) ||
							(pathname ? option.disabledOnPages?.includes(pathname) ?? false : false)
						}
					/>
				</SelectItem>
			))}
		</>
	)
}

export const DialogForm = styled.form`
	display: flex;
	flex-direction: column;
	gap: 8px;

	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font: inherit;
		margin: 12px 0 0;
	}

	input,
	textarea,
	select {
		padding: 8px;
		border-radius: 4px;
		border: ${({ theme }) => '1px solid ' + theme.text4};
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};
		color: ${({ theme }) => theme.text1};
		font: inherit;
	}

	input:disabled {
		opacity: 0.5;
	}

	&[data-variant='secondary'] {
		padding: 12px;
	}

	@media screen and (min-width: 640px) {
		&[data-variant='secondary'] {
			padding: 0;
		}
	}
`

export const PopoverForm = styled(DialogForm)`
	@media screen and (min-width: 640px) {
		label {
			margin: 12px 12px 0;
		}
	}
`

export const PopoverContent = styled.div`
	width: 240px;
	margin: 0 auto;
`
