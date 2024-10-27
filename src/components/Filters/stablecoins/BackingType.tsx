import { MenuButtonArrow, useSelectState } from 'ariakit'
import { useRouter } from 'next/router'
import { Checkbox } from '~/components'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
import { SelectItem, FilterFnsGroup, SelectButton, SelectPopover, ItemsSelected } from '../common'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'

export const stablecoinBackingOptions = [
	{
		name: 'Fiat',
		key: STABLECOINS_SETTINGS.FIATSTABLES,
		filterFn: (item) => item.pegMechanism === 'fiat-backed',
		help: 'Show stablecoins backed by fiat'
	},
	{
		name: 'Crypto',
		key: STABLECOINS_SETTINGS.CRYPTOSTABLES,
		filterFn: (item) => item.pegMechanism === 'crypto-backed',
		help: 'Show stablecoins backed by crypto'
	},
	{
		name: 'Algorithmic',
		key: STABLECOINS_SETTINGS.ALGOSTABLES,
		filterFn: (item) => item.pegMechanism === 'algorithmic',
		help: 'Show algorithmic stablecoins'
	}
]

export function BackingType({ pathname }: { pathname: string }) {
	const router = useRouter()

	const { backing = [], chain, ...queries } = router.query

	const values = stablecoinBackingOptions
		.filter((o) => {
			if (backing) {
				if (backing.length === 0) {
					return true
				} else if (typeof backing === 'string') {
					return o.key === backing
				} else {
					return backing.includes(o.key)
				}
			}
		})
		.map((o) => o.key)

	const updateBackings = (newFilters) => {
		if (values.length === 1 && newFilters.length === 0) {
			router.push(
				{
					pathname,
					query: {
						...queries,
						backing: 'None'
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
						backing: newFilters
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
		setValue: updateBackings,
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
					backing: stablecoinBackingOptions.map((o) => o.key)
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
					backing: 'None'
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
				<span>Filter by Backing</span>
				<MenuButtonArrow />
				{totalSelected > 0 && <ItemsSelected>{totalSelected}</ItemsSelected>}
			</SelectButton>
			<SelectPopover state={select} modal={!isLarge}>
				<FilterFnsGroup>
					<button onClick={clear}>Clear</button>

					<button onClick={toggleAll}>Toggle all</button>
				</FilterFnsGroup>
				{stablecoinBackingOptions.map((option) => (
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
