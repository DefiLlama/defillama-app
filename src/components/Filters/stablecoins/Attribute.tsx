import { MenuButtonArrow, useSelectState } from 'ariakit'
import { useRouter } from 'next/router'
import { Checkbox } from '~/components'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
import { SelectItem, FilterFnsGroup, SelectButton, SelectPopover } from '../common'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'

const { DEPEGGED } = STABLECOINS_SETTINGS

export const stablecoinAttributeOptions = [
	{
		name: 'Depegged',
		key: DEPEGGED,
		filterFn: (item) => true,
		help: 'Show stablecoins depegged by 10% or more'
	}
]

export function Attribute({ pathname }: { pathname: string }) {
	const router = useRouter()

	const { attribute = [], chain, ...queries } = router.query

	const values = stablecoinAttributeOptions
		.filter((o) => {
			if (attribute) {
				if (attribute.length === 0) {
					return true
				} else if (typeof attribute === 'string') {
					return o.key === attribute
				} else {
					return attribute.includes(o.key)
				}
			}
		})
		.map((o) => o.key)

	const updateAttributes = (newFilters) => {
		if (values.length === 1 && newFilters.length === 0) {
			router.push(
				{
					pathname,
					query: {
						...queries,
						attribute: 'None'
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
						attribute: newFilters
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
		setValue: updateAttributes,
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
					attribute: stablecoinAttributeOptions.map((o) => o.key)
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
					attribute: 'None'
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
				<span>Filter by Attribute</span>
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
				{stablecoinAttributeOptions.map((option) => (
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
