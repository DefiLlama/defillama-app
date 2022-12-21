import { MenuButtonArrow, useSelectState } from 'ariakit'
import { useRouter } from 'next/router'
import { Checkbox } from '~/components'
import HeadHelp from '~/components/HeadHelp'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
import { SelectItem, FilterFnsGroup, SelectButton, SelectPopover, ItemsSelected } from '../common'

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
		name: 'Variable',
		key: STABLECOINS_SETTINGS.PEGGEDVAR,
		filterFn: (item) => item.pegType === 'peggedVAR',
		help: 'Show stablecoins with a variable or floating peg'
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
				{totalSelected > 0 && <ItemsSelected>{totalSelected}</ItemsSelected>}
			</SelectButton>
			<SelectPopover state={select} modal={!isLarge}>
				<FilterFnsGroup>
					<button onClick={clear}>Clear</button>

					<button onClick={toggleAll}>Toggle all</button>
				</FilterFnsGroup>
				{stablecoinPegTypeOptions.map((option) => (
					<SelectItem key={option.key} value={option.key}>
						{option.help ? <HeadHelp title={option.name} text={option.help} /> : option.name}
						<Checkbox checked={values.includes(option.key)} />
					</SelectItem>
				))}
			</SelectPopover>
		</>
	)
}
