import { Select, SelectPopover, SelectArrow, useSelectState, SelectItem } from 'ariakit/select'
import { useRouter } from 'next/router'
import { Checkbox } from '~/components'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
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

	const selectState = useSelectState({
		value: values,
		setValue: updateAttributes,
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
			<Select
				state={selectState}
				className="bg-[var(--btn2-bg)] hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative"
			>
				<span>Filter by Attribute</span>
				{totalSelected > 0 ? (
					<span className="absolute -top-1 -right-1 text-[10px] rounded-full min-w-4 bg-[var(--bg4)]">
						{totalSelected}
					</span>
				) : null}
				<SelectArrow />
			</Select>
			{selectState.mounted ? (
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
					{stablecoinAttributeOptions.map((option) => (
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
			) : null}
		</>
	)
}
