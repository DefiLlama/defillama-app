import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import Link from 'next/link'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import type { ISearchItem } from '~/components/Search/types'
import { ChartData } from '~/utils/liquidations'
import { download } from '~/utils'
import { getLiquidationsCsvData } from '~/utils/liquidations'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { matchSorter } from 'match-sorter'

export const LiquidationsHeader = (props: { data: ChartData; options: ISearchItem[] }) => {
	const { data, options } = props
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap -mb-5">
			<AssetSelector symbol={data.symbol} options={options} />
			<CSVDownloadButton
				onClick={async () => {
					const csvString = await getLiquidationsCsvData(data.symbol)
					download(`${data.symbol}-all-positions.csv`, csvString)
				}}
			/>
		</div>
	)
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
			keys: ['name', 'symbol']
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
				<Ariakit.MenuButton className="bg-[var(--btn2-bg)]  hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative">
					<TokenLogo logo={selectedAsset.logo} size={24} />
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
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
				>
					<Ariakit.Combobox
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md py-2 px-3 m-3 mb-0"
					/>
					{matches.length > 0 ? (
						<Ariakit.ComboboxList>
							{matches.map((match, i) => (
								<Link key={`liq-asset-${match.name}`} href={match.route} passHref>
									<Ariakit.ComboboxItem
										value={match.symbol}
										focusOnHover
										hideOnClick
										role="link"
										className="flex items-center gap-1 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
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
