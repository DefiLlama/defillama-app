import { ColumnDef } from '@tanstack/react-table'
import styled from 'styled-components'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import TokenLogo from '~/components/TokenLogo'
import { formattedNum, formattedPercent, peggedAssetIconUrl, slug } from '~/utils'
import { formatColumnOrder } from '../../utils'
import type { IPeggedAssetsRow } from './types'

export const peggedAssetsColumn: ColumnDef<IPeggedAssetsRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const symbol = row.original.symbol && row.original.symbol !== '-' ? ` (${row.original.symbol})` : ''

			return (
				<Name>
					<span>{index + 1}</span>
					<TokenLogo logo={peggedAssetIconUrl(value)} data-lgonly />
					<CustomLink href={`/stablecoin/${slug(value)}`}>{value + symbol}</CustomLink>
				</Name>
			)
		},
		size: 240
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/stablecoins" iconType="chain" />,
		size: 200,
		meta: {
			align: 'end',
			headerHelperText: "Chains are ordered by pegged asset's issuance on each chain"
		}
	},
	{
		header: '% Off Peg',
		accessorKey: 'pegDeviation',
		size: 120,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const rowValues = row.original
			return (
				<span className="w-full flex items-center justify-end gap-1">
					{rowValues.depeggedTwoPercent ? <QuestionHelper text="Currently de-pegged by 2% or more." /> : null}
					{value ? formattedPeggedPercent(value) : value === 0 ? formattedPeggedPercent(0) : <span>-</span>}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m % Off Peg',
		accessorKey: 'pegDeviation_1m',
		size: 150,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const rowValues = row.original
			return (
				<span className="w-full flex items-center justify-end gap-1">
					{rowValues.pegDeviationInfo ? <QuestionHelper text={pegDeviationText(rowValues.pegDeviationInfo)} /> : null}
					{value ? formattedPeggedPercent(value) : <span>-</span>}
				</span>
			)
		},
		meta: {
			align: 'end',
			headerHelperText: 'Shows greatest % price deviation from peg over the past month'
		}
	},
	{
		header: 'Price',
		accessorKey: 'price',
		size: 110,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const rowValues = row.original
			return (
				<span className="w-full flex items-center justify-end gap-1">
					{rowValues.floatingPeg ? <QuestionHelper text="Has a variable, floating, or crawling peg." /> : null}
					{value ? formattedNum(value, true) : <span>-</span>}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 110,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Market Cap',
		accessorKey: 'mcap',
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
export const assetsColumnOrders = formatColumnOrder({
	0: ['name', 'mcap', 'change_1d', 'change_7d', 'change_1m', 'price', 'pegDeviation', 'pegDeviation_1m', 'chains'],
	1024: ['name', 'chains', 'pegDeviation', 'pegDeviation_1m', 'price', 'change_1d', 'change_7d', 'change_1m', 'mcap']
})

export const columnSizes = {
	0: {
		name: 180,
		chains: 180,
		pegDeviation: 120,
		pegDeviation_1m: 150,
		price: 110,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		mcap: 120
	},
	480: {
		name: 180,
		chains: 180,
		pegDeviation: 120,
		pegDeviation_1m: 150,
		price: 110,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		mcap: 120
	},
	1024: {
		name: 240,
		chains: 200,
		pegDeviation: 120,
		pegDeviation_1m: 150,
		price: 110,
		change_1d: 110,
		change_7d: 110,
		change_1m: 110,
		mcap: 120
	}
}

function formattedPeggedPercent(percent, noSign = false) {
	if (!percent && percent !== 0) {
		return null
	}

	let up = '#3fb950'
	let down = '#f85149'

	if (noSign) {
		up = down = ''
	}

	let color = ''
	let finalValue = ''
	let weight = 400

	percent = parseFloat(percent)

	if (!percent || percent === 0) {
		finalValue = '0%'
	} else if (percent < 0.0001 && percent > 0) {
		color = up
		finalValue = '< 0.0001%'
		weight = 500
	} else if (percent < 0 && percent > -0.0001) {
		color = down
		finalValue = '< 0.0001%'
		weight = 500
	} else {
		let fixedPercent = percent.toFixed(2)

		if (fixedPercent === '0.00') {
			finalValue = '0%'
		} else if (fixedPercent > 0) {
			const prefix = noSign ? '' : '+'

			if (fixedPercent > 0) {
				if (fixedPercent > 100) {
					finalValue = `${prefix}${percent?.toFixed(0).toLocaleString()}%`
					color = up
					weight = 500
				} else {
					if (fixedPercent > 2) {
						finalValue = `${prefix}${fixedPercent}%`
						color = up
						weight = 700
					} else {
						finalValue = `${prefix}${fixedPercent}%`
						color = up
						weight = 500
					}
				}
			} else {
				if (fixedPercent < -2) {
					finalValue = `${fixedPercent}%`
					color = down
					weight = 700
				} else {
					finalValue = `${fixedPercent}%`
					color = down
					weight = 500
				}
			}
		} else {
			color = down
			finalValue = `${fixedPercent}%`
		}
	}

	return (
		<span className="font-[var(--weight)] text-[var(--color)]" style={{ '--weight': weight, '--color': color } as any}>
			{finalValue}
		</span>
	)
}

const formatPriceSource = {
	chainlink: 'Chainlink',
	uniswap: 'a Uniswap v3 pool oracle',
	dexscreener: 'DEX Screener',
	curve: 'a Curve pool oracle',
	coingecko: 'CoinGecko',
	birdeye: 'Birdeye',
	kucoin: 'KuCoin Exchange',
	defillama: 'DefiLlama',
	kaddex: 'Kaddex'
}

function pegDeviationText(pegDeviationInfo) {
	const { timestamp, price, priceSource } = pegDeviationInfo
	const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
	return `On ${date}, ${formatPriceSource[priceSource]} reported a price of $${formattedNum(price)}.`
}

const Name = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;
	position: relative;

	a {
		overflow: hidden;
		text-overflow: ellipsis;
		whitespace: nowrap;
	}

	& > *[data-logo] {
		display: none;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		& > *[data-logo] {
			display: flex;
		}
	}
`
