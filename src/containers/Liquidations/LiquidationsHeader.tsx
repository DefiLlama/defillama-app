import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import Link from 'next/link'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import type { ISearchItem } from '~/components/Search/types'
import { ChartData } from '~/containers/Liquidations/utils'
import { matchSorter } from 'match-sorter'

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

	const matches = React.useMemo(() => {
		return matchSorter(options, searchValue, {
			baseSort: (a, b) => (a.index < b.index ? -1 : 1),
			keys: ['name', 'symbol'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [options, searchValue])

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
				<Ariakit.MenuButton className="flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium">
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
						className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
					}}
					className="flex flex-col bg-[var(--bg1)] rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
				>
					<Ariakit.Combobox
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md text-base py-1 px-3 m-3 mb-0"
					/>
					{matches.length > 0 ? (
						<Ariakit.ComboboxList>
							{matches.map((match, i) => (
								<Link key={`liq-asset-${match.name}`} href={match.route} prefetch={false} passHref>
									<Ariakit.ComboboxItem
										value={match.symbol}
										focusOnHover
										hideOnClick
										role="link"
										className="flex items-center gap-1 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-[var(--form-control-border)]"
									>
										<TokenLogo logo={match.logo} size={20} />
										{match.name} ({match.symbol})
									</Ariakit.ComboboxItem>
								</Link>
							))}
						</Ariakit.ComboboxList>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</Ariakit.Menu>
			</Ariakit.MenuProvider>
		</Ariakit.ComboboxProvider>
	)
}
