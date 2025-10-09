import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { FormattedName } from '~/components/FormattedName'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import type { ISearchItem } from '~/components/Search/types'
import { TokenLogo } from '~/components/TokenLogo'

interface IProps {
	options: ISearchItem[]
	symbol: string
}

export function AssetSelector({ options, symbol }: IProps) {
	const selectedAsset = React.useMemo(
		() => options.find((x) => x.symbol.toLowerCase() === symbol.toLowerCase()),
		[symbol, options]
	)

	const [searchValue, setSearchValue] = React.useState('')
	const deferredSearchValue = React.useDeferredValue(searchValue)
	const matches = React.useMemo(() => {
		if (!deferredSearchValue) return options
		return matchSorter(options, deferredSearchValue, {
			keys: ['name', 'symbol'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [options, deferredSearchValue])

	return (
		<Ariakit.ComboboxProvider
			resetValueOnHide
			setValue={(value) => {
				React.startTransition(() => {
					setSearchValue(value)
				})
			}}
		>
			<Ariakit.MenuProvider>
				<Ariakit.MenuButton className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md bg-(--link-active-bg) p-2 text-white">
					<TokenLogo logo={selectedAsset.logo} size={20} />
					<FormattedName text={selectedAsset.name} maxCharacters={20} fontWeight={700} />
					<span className="mr-auto font-normal">({selectedAsset.symbol})</span>
					<Ariakit.MenuButtonArrow className="ml-auto" />
				</Ariakit.MenuButton>
				<Ariakit.Menu
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					wrapperProps={{
						className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
					}}
					className="max-sm:drawer thin-scrollbar z-10 flex h-[calc(100dvh-80px)] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60dvh] lg:h-full lg:max-h-(--popover-available-height) dark:border-[hsl(204,3%,32%)]"
				>
					<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
						<Icon name="x" className="h-5 w-5" />
					</Ariakit.PopoverDismiss>
					<Ariakit.Combobox
						placeholder="Search..."
						autoFocus
						className="m-3 mb-0 rounded-md bg-white px-3 py-1 text-base dark:bg-black"
					/>
					{matches.length > 0 ? (
						<Ariakit.ComboboxList>
							{matches.map((match, i) => (
								<Ariakit.ComboboxItem
									key={`liq-asset-${match.name}`}
									value={match.symbol}
									focusOnHover
									hideOnClick
									role="link"
									render={<BasicLink href={match.route as string} />}
									className="flex shrink-0 cursor-pointer items-center gap-1 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
								>
									<TokenLogo logo={match.logo} size={20} />
									{match.name} ({match.symbol})
								</Ariakit.ComboboxItem>
							))}
						</Ariakit.ComboboxList>
					) : (
						<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
					)}
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
		</Ariakit.ComboboxProvider>
	)
}
