import { MenuButtonArrow, useSelectState } from 'ariakit'
import { useRouter } from 'next/router'
import { Checkbox } from '~/components'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
import { SelectItem, FilterFnsGroup, SelectButton, SelectPopover } from '../common'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'

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

export function PegType({ pathname }: { pathname: string }) {
	const router = useRouter()

	const { pegtype = [], chain, ...queries } = router.query

	const values = stablecoinPegTypeOptions
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
		.map((o) => o.key)

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

	const select = useSelectState({
		value: values,
		setValue: updatePegTypes,
		gutter: 8,
		animated: true,
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

	const totalSelected = values.length

	return (
		<>
			<SelectButton state={select}>
				<span>Filter by Peg Type</span>
				<MenuButtonArrow />
				{totalSelected > 0 ? (
					<span className="absolute -top-1 -right-1 text-[10px] rounded-full p-[2px] min-w-1 bg-[var(--bg4)]">
						{totalSelected}
					</span>
				) : null}
			</SelectButton>
			<SelectPopover state={select} modal={!isLarge}>
				<FilterFnsGroup>
					<button onClick={clear}>Clear</button>

					<button onClick={toggleAll}>Toggle all</button>
				</FilterFnsGroup>
				{stablecoinPegTypeOptions.map((option) => (
					<SelectItem key={option.key} value={option.key}>
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
