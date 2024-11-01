import { useRouter } from 'next/router'
import { SelectArrow, SelectPopover, Select, useSelectState } from 'ariakit/select'
import { SelectContent } from './Base'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { SlidingMenu } from '~/components/SlidingMenu'

interface IColumnFiltersProps {
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
	show7dBaseApy?: boolean
	show7dIL?: boolean
	show1dVolume?: boolean
	show7dVolume?: boolean
	showInceptionApy?: boolean
	showBorrowBaseApy?: boolean
	showBorrowRewardApy?: boolean
	showNetBorrowApy?: boolean
	showLTV?: boolean
	showTotalSupplied?: boolean
	showTotalBorrowed?: boolean
	showAvailable?: boolean
}

const optionalFilters = [
	{ name: '7d Base APY', key: 'show7dBaseApy' },
	{ name: '7d IL', key: 'show7dIL' },
	{ name: '1d Volume', key: 'show1dVolume' },
	{ name: '7d Volume', key: 'show7dVolume' },
	{ name: 'Inception APY', key: 'showInceptionApy' },
	{ name: 'Borrow Base APY', key: 'showBorrowBaseApy' },
	{ name: 'Borrow Reward APY', key: 'showBorrowRewardApy' },
	{ name: 'Net Borrow APY', key: 'showNetBorrowApy' },
	{ name: 'Max LTV', key: 'showLTV' },
	{ name: 'Supplied', key: 'showTotalSupplied' },
	{ name: 'Borrowed', key: 'showTotalBorrowed' },
	{ name: 'Available', key: 'showAvailable' }
]

export function ColumnFilters({ variant = 'primary', subMenu, ...props }: IColumnFiltersProps) {
	const router = useRouter()

	const {
		show7dBaseApy,
		show7dIL,
		show1dVolume,
		show7dVolume,
		showInceptionApy,
		showNetBorrowApy,
		showBorrowBaseApy,
		showBorrowRewardApy,
		showLTV,
		showTotalSupplied,
		showTotalBorrowed,
		showAvailable,
		...queries
	} = router.query

	const options = optionalFilters.filter((op) => props[op.key])

	const selectedOptions = options.filter((option) => router.query[option.key] === 'true').map((op) => op.key)

	const addOption = (newOptions) => {
		router.push(
			{
				pathname: router.pathname,
				query: { ...queries, ...Object.fromEntries(newOptions.map((op) => [op, true])) }
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		value: selectedOptions,
		setValue: addOption,
		gutter: 8,
		renderCallback,
		...(!subMenu && { animated: isLarge ? false : true })
	})

	const toggleAllOptions = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					...Object.fromEntries(options.map((op) => [op.key, true]))
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAllOptions = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const isSelected = selectedOptions.length > 0

	if (subMenu) {
		return (
			<SlidingMenu label="Columns" selectState={selectState}>
				<SelectContent
					options={options}
					selectedOptions={selectedOptions}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					pathname={router.pathname}
					variant={variant}
				/>
			</SlidingMenu>
		)
	}

	const selectedOptionNames = selectedOptions.map((op) => optionalFilters.find((x) => x.key === op)?.name ?? op)

	return (
		<>
			<Select
				state={selectState}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] text-xs flex-nowrap"
			>
				{isSelected ? (
					<>
						<span>Columns: </span>
						<span className="text-[var(--link)]">
							{selectedOptionNames.length > 2
								? `${selectedOptionNames[0]} + ${selectedOptionNames.length - 1} others`
								: selectedOptionNames.join(', ')}
						</span>
					</>
				) : (
					<span>Columns</span>
				)}

				<SelectArrow />
			</Select>

			<SelectPopover
				state={selectState}
				className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh]"
			>
				<SelectContent
					options={options}
					selectedOptions={selectedOptions}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					pathname={router.pathname}
					variant={variant}
				/>
			</SelectPopover>
		</>
	)
}

export function ColumnFilters2({
	label,
	variant = 'primary',
	subMenu,
	clearAllOptions,
	toggleAllOptions,
	selectedOptions,
	options,
	addOption
}) {
	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		value: selectedOptions,
		setValue: addOption,
		gutter: 8,
		renderCallback,
		...(!subMenu && { animated: isLarge ? false : true })
	})

	if (subMenu) {
		return (
			<SlidingMenu label="Columns" selectState={selectState}>
				<SelectContent
					options={options}
					selectedOptions={selectedOptions}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					pathname={null}
					variant={variant}
				/>
			</SlidingMenu>
		)
	}

	return (
		<>
			<Select
				state={selectState}
				className="bg-[var(--btn2-bg)] hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative"
			>
				<span>{label}</span>
				<span className="absolute -top-1 -right-1 text-[10px] rounded-full min-w-4 bg-[var(--bg4)]">
					{selectedOptions.length}
				</span>
				<SelectArrow />
			</Select>

			{selectState.mounted ? (
				<SelectPopover
					state={selectState}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh]"
				>
					<SelectContent
						options={options}
						selectedOptions={selectedOptions}
						clearAllOptions={clearAllOptions}
						toggleAllOptions={toggleAllOptions}
						pathname={null}
						variant={variant}
					/>
				</SelectPopover>
			) : null}
		</>
	)
}
