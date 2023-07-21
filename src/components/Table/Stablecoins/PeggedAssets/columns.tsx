import { ColumnDef } from '@tanstack/react-table'
import styled from 'styled-components'
import { Text } from 'rebass'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import QuestionHelper from '~/components/QuestionHelper'
import { AutoRow } from '~/components/Row'
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
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{rowValues.depeggedTwoPercent ? <QuestionHelper text="Currently de-pegged by 2% or more." /> : null}
					{value ? formattedPeggedPercent(value) : value === 0 ? formattedPeggedPercent(0) : '-'}
				</AutoRow>
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
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{rowValues.pegDeviationInfo ? <QuestionHelper text={pegDeviationText(rowValues.pegDeviationInfo)} /> : null}
					<span>{value ? formattedPeggedPercent(value) : '-'}</span>
				</AutoRow>
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
		size: 100,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const rowValues = row.original
			return (
				<AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
					{rowValues.floatingPeg ? <QuestionHelper text="Has a variable, floating, or crawling peg." /> : null}
					<span>{value ? formattedNum(value, true) : '-'}</span>
				</AutoRow>
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
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 100,
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
		price: 100,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		mcap: 120
	},
	480: {
		name: 180,
		chains: 180,
		pegDeviation: 120,
		pegDeviation_1m: 150,
		price: 100,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		mcap: 120
	},
	1024: {
		name: 240,
		chains: 200,
		pegDeviation: 120,
		pegDeviation_1m: 150,
		price: 100,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		mcap: 120
	}
}

function formattedPeggedPercent(percent, noSign = false) {
	if (percent === null) {
		return null
	}

	let up = '#3fb950'
	let down = '#f85149'

	if (noSign) {
		up = down = ''
	}

	percent = parseFloat(percent)
	if (!percent || percent === 0) {
		return <Text fontWeight={500}>0%</Text>
	}

	if (percent < 0.0001 && percent > 0) {
		return (
			<Text fontWeight={500} color={up}>
				{'< 0.0001%'}
			</Text>
		)
	}

	if (percent < 0 && percent > -0.0001) {
		return (
			<Text fontWeight={500} color={down}>
				{'< 0.0001%'}
			</Text>
		)
	}

	let fixedPercent = percent.toFixed(2)
	if (fixedPercent === '0.00') {
		return '0%'
	}
	const prefix = noSign ? '' : '+'
	if (fixedPercent > 0) {
		if (fixedPercent > 100) {
			return <Text fontWeight={500} color={up}>{`${prefix}${percent?.toFixed(0).toLocaleString()}%`}</Text>
		} else {
			if (fixedPercent > 2) {
				return <Text fontWeight={700} color={up}>{`${prefix}${fixedPercent}%`}</Text>
			} else {
				return <Text fontWeight={500} color={up}>{`${prefix}${fixedPercent}%`}</Text>
			}
		}
	} else {
		if (fixedPercent < -2) {
			return <Text fontWeight={700} color={down}>{`${fixedPercent}%`}</Text>
		} else {
			return <Text fontWeight={500} color={down}>{`${fixedPercent}%`}</Text>
		}
	}
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
