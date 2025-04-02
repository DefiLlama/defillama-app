import { useRouter } from 'next/router'
import { STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'
import { Tooltip } from '~/components/Tooltip'
import { Icon } from '~/components/Icon'
import { NestedMenu, NestedMenuItem } from '~/components/NestedMenu'
import { useMemo } from 'react'
import * as Ariakit from '@ariakit/react'

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

export function BackingType({ pathname, nestedMenu }: { pathname: string; nestedMenu: boolean }) {
	const router = useRouter()

	const { backing = [], chain, ...queries } = router.query

	const { values, selectedNames } = useMemo(() => {
		const values = Object.fromEntries(
			stablecoinBackingOptions
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
				.map((o) => [o.key, o.name])
		)

		return { values: Object.keys(values), selectedNames: Object.values(values) }
	}, [stablecoinBackingOptions, backing])

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

	if (nestedMenu) {
		return (
			<Ariakit.SelectProvider value={values} setValue={updateBackings}>
				<NestedMenu label="Backing Type" render={<Ariakit.Select />}>
					<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-black/10 dark:border-white/10">
						<button onClick={clear} className="p-3">
							Clear
						</button>
						<button onClick={toggleAll} className="p-3">
							Toggle all
						</button>
					</span>
					{stablecoinBackingOptions.map((option) => (
						<NestedMenuItem
							key={option.key}
							render={<Ariakit.SelectItem value={option.key} />}
							hideOnClick={false}
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
							<Ariakit.SelectItemCheck className="h-3 w-3 flex items-center justify-center rounded-sm flex-shrink-0 border border-[#28a2b5]" />
						</NestedMenuItem>
					))}
				</NestedMenu>
			</Ariakit.SelectProvider>
		)
	}

	return (
		<Ariakit.SelectProvider value={values} setValue={updateBackings}>
			<Ariakit.Select className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] text-xs flex-nowrap">
				{selectedNames.length > 0 ? (
					<>
						<span>Backing: </span>
						<span className="text-[var(--link)]">
							{selectedNames.length > 2
								? `${selectedNames[0]} + ${selectedNames.length - 1} others`
								: selectedNames.join(', ')}
						</span>
					</>
				) : (
					'Backing Type'
				)}
				<Ariakit.SelectArrow />
			</Ariakit.Select>
			<Ariakit.SelectPopover
				className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				unmountOnHide
				gutter={8}
				wrapperProps={{
					className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
				}}
			>
				<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-black/10 dark:border-white/10">
					<button onClick={clear} className="p-3">
						Clear
					</button>
					<button onClick={toggleAll} className="p-3">
						Toggle all
					</button>
				</span>
				{stablecoinBackingOptions.map((option) => (
					<Ariakit.SelectItem
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
						<Ariakit.SelectItemCheck className="h-3 w-3 flex items-center justify-center rounded-sm flex-shrink-0 border border-[#28a2b5]" />
					</Ariakit.SelectItem>
				))}
			</Ariakit.SelectPopover>
		</Ariakit.SelectProvider>
	)
}
