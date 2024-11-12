import { Select, SelectPopover, SelectArrow, useSelectState, SelectItem } from 'ariakit/select'
import { useRouter } from 'next/router'
import { Checkbox } from '~/components'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'
import { SlidingMenu } from '~/components/SlidingMenu'
import { SelectContent } from '../common/SelectContent'
import { useMemo } from 'react'

export const stablecoinPegTypeOptions = [
	{
		name: 'USD',
		key: STABLECOINS_SETTINGS.PEGGEDUSD,
		filterFn: (item) => item.pegType === 'peggedUSD',
		help: 'Show stablecoins pegged to USD'
	},
	{
		name: 'EUR',
		key: STABLECOINS_SETTINGS.PEGGEDEUR,
		filterFn: (item) => item.pegType === 'peggedEUR',
		help: 'Show stablecoins pegged to EUR'
	},
	{
		name: 'SGD',
		key: STABLECOINS_SETTINGS.PEGGEDSGD,
		filterFn: (item) => item.pegType === 'peggedSGD',
		help: 'Show stablecoins pegged to SGD'
	},
	{
		name: 'JPY',
		key: STABLECOINS_SETTINGS.PEGGEDJPY,
		filterFn: (item) => item.pegType === 'peggedJPY',
		help: 'Show stablecoins pegged to JPY'
	},
	{
		name: 'CNY',
		key: STABLECOINS_SETTINGS.PEGGEDCNY,
		filterFn: (item) => item.pegType === 'peggedCNY',
		help: 'Show stablecoins pegged to CNY'
	},
	{
		name: 'UAH',
		key: STABLECOINS_SETTINGS.PEGGEDUAH,
		filterFn: (item) => item.pegType === 'peggedUAH',
		help: 'Show stablecoins pegged to UAH'
	},
	{
		name: 'ARS',
		key: STABLECOINS_SETTINGS.PEGGEDARS,
		filterFn: (item) => item.pegType === 'peggedARS',
		help: 'Show stablecoins pegged to ARS'
	},
	{
		name: 'GBP',
		key: STABLECOINS_SETTINGS.PEGGEDGBP,
		filterFn: (item) => item.pegType === 'peggedGBP',
		help: 'Show stablecoins pegged to GBP'
	},
	{
		name: 'Variable',
		key: STABLECOINS_SETTINGS.PEGGEDVAR,
		filterFn: (item) => item.pegType === 'peggedVAR',
		help: 'Show stablecoins with a variable or floating peg'
	},
	{
		name: 'CAD',
		key: STABLECOINS_SETTINGS.PEGGEDCAD,
		filterFn: (item) => item.pegType === 'peggedCAD',
		help: 'Show stablecoins pegged to CAD'
	},
	{
		name: 'AUD',
		key: STABLECOINS_SETTINGS.PEGGEDAUD,
		filterFn: (item) => item.pegType === 'peggedAUD',
		help: 'Show stablecoins pegged to AUD'
	}
]

export function PegType({ pathname, subMenu }: { pathname: string; subMenu: boolean }) {
	const router = useRouter()

	const { pegtype = [], chain, ...queries } = router.query

	const { values, selectedNames } = useMemo(() => {
		const values = Object.fromEntries(
			stablecoinPegTypeOptions
				.filter((o) => {
					if (pegtype) {
						if (pegtype.length === 0) {
							return true
						} else if (typeof pegtype === 'string') {
							return o.key === pegtype
						} else {
							return pegtype.includes(o.key)
						}
					}
				})
				.map((o) => [o.key, o.name])
		)

		return { values: Object.keys(values), selectedNames: Object.values(values) }
	}, [stablecoinPegTypeOptions, pegtype])

	const updatePegTypes = (newFilters) => {
		if (values.length === 1 && newFilters.length === 0) {
			router.push(
				{
					pathname,
					query: {
						...queries,
						pegtype: 'None'
					}
				},
				undefined,
				{ shallow: true }
			)
		} else {
			router.push(
				{
					pathname,
					query: {
						...queries,
						pegtype: newFilters
					}
				},
				undefined,
				{ shallow: true }
			)
		}
	}

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		value: values,
		setValue: updatePegTypes,
		gutter: 8,
		animated: isLarge ? false : true,
		renderCallback
	})

	const toggleAll = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					pegtype: stablecoinPegTypeOptions.map((o) => o.key)
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clear = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					pegtype: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	if (subMenu) {
		return (
			<SlidingMenu label="Peg Type" selectState={selectState}>
				<SelectContent
					options={stablecoinPegTypeOptions}
					selectedOptions={values}
					clearAllOptions={clear}
					toggleAllOptions={toggleAll}
					variant="secondary"
					pathname={pathname}
				/>
			</SlidingMenu>
		)
	}

	return (
		<>
			<Select
				state={selectState}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] text-xs flex-nowrap"
			>
				{selectedNames.length > 0 ? (
					<>
						<span>Peg: </span>
						<span className="text-[var(--link)]">
							{selectedNames.length > 2
								? `${selectedNames[0]} + ${selectedNames.length - 1} others`
								: selectedNames.join(', ')}
						</span>
					</>
				) : (
					'Peg Type'
				)}
				<SelectArrow />
			</Select>
			<SelectPopover
				state={selectState}
				className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
			>
				<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-black/10 dark:border-white/10">
					<button onClick={clear} className="p-3">
						Clear
					</button>
					<button onClick={toggleAll} className="p-3">
						Toggle all
					</button>
				</span>
				{stablecoinPegTypeOptions.map((option) => (
					<SelectItem
						key={option.key}
						value={option.key}
						className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
					>
						{option.help ? (
							<Tooltip content={option.help}>
								<span>{option.name}</span>
								<Icon name="help-circle" height={15} width={15} />
							</Tooltip>
						) : (
							option.name
						)}
						<Checkbox checked={values.includes(option.key)} />
					</SelectItem>
				))}
			</SelectPopover>
		</>
	)
}
