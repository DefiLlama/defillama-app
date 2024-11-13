import * as React from 'react'
import Link from 'next/link'
import { Combobox, ComboboxItem, ComboboxList, useComboboxState } from 'ariakit/combobox'
import { Menu, MenuButton, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import type { ISearchItem } from '~/components/Search/types'
import { ChartData } from '~/utils/liquidations'
import { download } from '~/utils'
import { getLiquidationsCsvData } from '~/utils/liquidations'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

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
	const defaultList = options.map(({ name, symbol }) => `${name.toLowerCase()} - ${symbol.toLowerCase()}`)

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const combobox = useComboboxState({ defaultList, gutter: 8, animated: isLarge ? false : true, renderCallback })

	const menu = useMenuState(combobox)

	// Resets combobox value when menu is closed
	if (!menu.mounted && combobox.value) {
		combobox.setValue('')
	}

	const selectedAsset = React.useMemo(
		() => options.find((x) => x.symbol.toLowerCase() === symbol.toLowerCase()),
		[symbol, options]
	)

	return (
		<>
			<MenuButton
				state={menu}
				className="bg-[var(--btn2-bg)]  hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative"
			>
				<TokenLogo logo={selectedAsset.logo} size={24} />
				<FormattedName text={selectedAsset.name} maxCharacters={20} fontWeight={700} />
				<span className="font-normal mr-auto">({selectedAsset.symbol})</span>
				<MenuButtonArrow className="ml-auto" />
			</MenuButton>
			{menu.mounted ? (
				<Menu
					state={menu}
					composite={false}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					<Combobox
						state={combobox}
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md py-2 px-3 m-3 mb-0"
					/>
					{combobox.matches.length > 0 ? (
						<ComboboxList state={combobox} className="flex flex-col overflow-auto overscroll-contain">
							{combobox.matches.map((value, i) => (
								<AssetButtonLink options={options} value={value} key={value + i} />
							))}
						</ComboboxList>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</Menu>
			) : null}
		</>
	)
}

const getMatchingOption = (options: ISearchItem[], value: string): ISearchItem => {
	return options.find(({ name, symbol }) => `${name.toLowerCase()} - ${symbol.toLowerCase()}` === value)
}

const AssetButtonLink = (props: { options: ISearchItem[]; value: string }) => {
	const { options, value } = props
	const matchingOption = getMatchingOption(options, value)
	return (
		<Link href={matchingOption.route} passHref>
			<ComboboxItem
				value={value}
				focusOnHover
				setValueOnClick={false}
				role="link"
				className="flex items-center gap-1 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
			>
				<TokenLogo logo={matchingOption.logo} size={20} />
				{matchingOption.name} ({matchingOption.symbol})
			</ComboboxItem>
		</Link>
	)
}
