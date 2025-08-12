import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import type { ISearchItem } from '~/components/Search/types'
import { ChartData } from '~/containers/Liquidations/utils'
import { matchSorter } from 'match-sorter'
import { BasicLink } from '~/components/Link'

export const LiquidationsHeader = (props: { data: ChartData; options: ISearchItem[] }) => {
	const { data, options } = props
	return <AssetSelector symbol={data.symbol} options={options} />
}

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
		return matchSorter(options, deferredSearchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
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
				<Ariakit.MenuButton className="flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium">
					<TokenLogo logo={selectedAsset.logo} size={20} />
					<FormattedName text={selectedAsset.name} maxCharacters={20} fontWeight={700} />
					<span className="font-normal mr-auto">({selectedAsset.symbol})</span>
					<Ariakit.MenuButtonArrow className="ml-auto" />
				</Ariakit.MenuButton>
				<Ariakit.Menu
					unmountOnHide
					hideOnInteractOutside
					gutter={6}
					wrapperProps={{
						className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
					}}
					className="flex flex-col bg-(--bg1) rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
				>
					<Ariakit.Combobox
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md text-base py-1 px-3 m-3 mb-0"
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
									className="flex items-center gap-1 py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer last-of-type:rounded-b-md border-b border-(--form-control-border)"
								>
									<TokenLogo logo={match.logo} size={20} />
									{match.name} ({match.symbol})
								</Ariakit.ComboboxItem>
							))}
						</Ariakit.ComboboxList>
					) : (
						<p className="text-(--text1) py-6 px-3 text-center">No results found</p>
					)}
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
		</Ariakit.ComboboxProvider>
	)
}
