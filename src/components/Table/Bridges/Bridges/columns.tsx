import { ColumnDef } from '@tanstack/react-table'
import styled from 'styled-components'
import { Text } from 'rebass'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import { ExternalLink } from 'react-feather'
import { AutoRow } from '~/components/Row'
import { formattedNum, formattedPercent, chainIconUrl, assetIconUrl, toNiceDayAndHour, getBlockExplorer } from '~/utils'
import TokenLogo from '~/components/TokenLogo'
import { formatColumnOrder } from '../../utils'
import type { IBridge, IBridgeChain } from './types'
import { getBlockExplorerForTx, getBlockExplorerForAddress } from '~/utils/bridges/blockExplorers'
import { standardizeProtocolName } from '~/utils'

export const bridgesColumn: ColumnDef<IBridge>[] = [
	{
		header: 'Name',
		accessorKey: 'displayName',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const linkValue = standardizeProtocolName(value)
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<Name>
					<span>{index + 1}</span>
					<CustomLink href={`/bridge/${linkValue}`}>{value}</CustomLink>
				</Name>
			)
		},
		size: 240
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/bridges" iconType="chain" />,
		size: 200,
		meta: {
			align: 'end',
			headerHelperText: 'Chains are ordered by bridge volume on each chain'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Volume',
		accessorKey: 'volumePrevDay',
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h # of Txs',
		accessorKey: 'txsPrevDay',
		cell: (info) => <>{info.getValue()}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

export const bridgeChainsColumn: ColumnDef<IBridgeChain>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<Name>
					<span>{index + 1}</span>
					<TokenLogo logo={chainIconUrl(value)} data-lgonly />
					<CustomLink href={`/bridges/${value}`}>{value}</CustomLink>
				</Name>
			)
		},
		size: 240
	},
	{
		header: 'Net Flow',
		accessorKey: 'netFlow',
		cell: (info) => {
			const value = info.getValue()
			if (value) {
				return (
					<Text as="span" color={value > 0 ? 'green' : 'red'}>
						${formattedNum(info.getValue())}
					</Text>
				)
			}
			return <Text as="span">$0</Text>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Bridged To Volume',
		accessorKey: 'prevDayUsdWithdrawals',
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Bridged From Volume',
		accessorKey: 'prevDayUsdDeposits',
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Top Token To',
		accessorKey: 'topTokenWithdrawnSymbol',
		cell: ({ getValue }) => {
			const value = getValue() as string
			if (value) {
				return <>{value}</>
			} else return <>Not found</>
		},
		meta: {
			align: 'end'
		},
		size: 100,
	},
	{
		header: 'Top Token To Vol',
		accessorKey: 'topTokenWithdrawnUsd',
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Top Token From',
		accessorKey: 'topTokenDepositedSymbol',
		cell: ({ getValue }) => {
			const value = getValue() as string
			if (value) {
				return <>{value}</>
			} else return <>Not found</>
		},
		meta: {
			align: 'end'
		},
		size: 100,
	},
	{
		header: 'Top Token From Vol',
		accessorKey: 'topTokenDepositedUsd',
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	}
]

export const largeTxsColumn: ColumnDef<IBridge>[] = [
	{
		header: 'Timestamp',
		accessorKey: 'date',
		cell: (info) => <>{toNiceDayAndHour(info.getValue())}</>,
		size: 120
	},
	{
		header: 'Deposit/Withdrawal',
		accessorKey: 'isDeposit',
		cell: ({ getValue }) => {
			const value = getValue() as boolean
			return (
				<Text as="span" color={value ? 'red' : 'green'}>
					{value ? 'Withdrawal' : 'Deposit'}
				</Text>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Token',
		accessorKey: 'symbol',
		cell: ({ getValue }) => {
			const value = getValue() as string
			if (value) {
				return <>{value}</>
			} else return <>Not found</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Value',
		accessorKey: 'usdValue',
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Explorer Link',
		accessorKey: 'txHash',
		cell: ({ getValue }) => {
			const value = getValue() as string
			const { blockExplorerLink } = getBlockExplorerForTx(value)
			if (value) {
				return (
					<a href={blockExplorerLink} target="_blank" rel="noopener noreferrer">
						<AutoRow as="span" gap="8px" justify="end">
							View Transaction
							<ExternalLink size={10} />
						</AutoRow>
					</a>
				)
			} else return <>Not found</>
		},
		meta: {
			align: 'end'
		},
		size: 100
	}
]

export const bridgeTokensColumn: ColumnDef<IBridge>[] = [
	{
		header: 'Token',
		accessorKey: 'symbol',
		cell: ({ getValue }) => {
			const value = getValue() as string
			if (value) {
				return <>{value}</>
			} else return <>Not found</>
		},
		size: 120
	},
	{
		header: 'Bridged To',
		accessorKey: 'withdrawn',
		cell: (info) => <>${formattedNum(info.getValue() ?? 0)}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Bridged From',
		accessorKey: 'deposited',
		cell: (info) => <>${formattedNum(info.getValue() ?? 0)}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Volume',
		accessorKey: 'volume',
		cell: (info) => <>${formattedNum(info.getValue())}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

export const bridgeAddressesColumn: ColumnDef<IBridge>[] = [
	{
		header: 'Address',
		accessorKey: 'address',
		cell: ({ getValue }) => {
			const value = getValue() as string
			const { blockExplorerLink } = getBlockExplorerForAddress(value)
			if (value) {
				return (
					<a href={blockExplorerLink} target="_blank" rel="noopener noreferrer">
						<Name>
							{value}
							<ExternalLink size={10} />
						</Name>
					</a>
				)
			} else return <>Not found</>
		},
		size: 240
	},
	{
		header: 'Bridged To',
		accessorKey: 'withdrawn',
		cell: (info) => <>${formattedNum(info.getValue() ?? 0)}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Bridged From',
		accessorKey: 'deposited',
		cell: (info) => <>${formattedNum(info.getValue() ?? 0)}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Transactions',
		accessorKey: 'txs',
		cell: (info) => <>{info.getValue()}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
export const bridgesColumnOrders = formatColumnOrder({
	0: ['displayName', 'volumePrevDay', 'change_1d', 'change_7d', 'change_1m', 'chains', 'txsPrevDay'],
	1024: ['displayName', 'chains', 'change_1d', 'change_7d', 'change_1m', 'volumePrevDay', 'txsPrevDay']
})

export const bridgeChainsColumnOrders = formatColumnOrder({
	0: [
		'name',
		'netFlow',
		'prevDayUsdWithdrawals',
		'prevDayUsdDeposits',
		'topTokenWithdrawnSymbol',
		'topTokenWithdrawnUsd',
		'topTokenDepositedSymbol',
		'topTokenDepositedUsd'
	],
	1024: [
		'name',
		'netFlow',
		'prevDayUsdWithdrawals',
		'prevDayUsdDeposits',
		'topTokenWithdrawnSymbol',
		'topTokenWithdrawnUsd',
		'topTokenDepositedSymbol',
		'topTokenDepositedUsd'
	]
})

export const largeTxsColumnOrders = formatColumnOrder({
	0: ['date', 'symbol', 'isDeposit', 'usdValue', 'txHash'],
	1024: ['date', 'isDeposit', 'symbol', 'usdValue', 'txHash']
})

export const bridgeTokensColumnOrders = formatColumnOrder({
	0: ['symbol', 'withdrawn', 'deposited', 'volume'],
	1024: ['symbol', 'withdrawn', 'deposited', 'volume']
})

export const bridgeAddressesColumnOrders = formatColumnOrder({
	0: ['address', 'withdrawn', 'deposited', 'txs'],
	1024: ['address', 'withdrawn', 'deposited', 'txs']
})

export const bridgesColumnSizes = {
	0: {
		displayName: 140,
		chains: 180,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		volumePrevDay: 120,
		txsPrevDay: 120
	},
	480: {
		displayName: 180,
		chains: 180,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		volumePrevDay: 120,
		txsPrevDay: 120
	},
	1024: {
		displayName: 240,
		chains: 200,
		change_1d: 100,
		change_7d: 100,
		change_1m: 100,
		volumePrevDay: 120,
		txsPrevDay: 120
	}
}

export const bridgeChainsColumnSizes = {
	0: {
		name: 140,
		netFlow: 120,
		prevDayUsdWithdrawals: 160,
		prevDayUsdDeposits: 160,
		topTokenWithdrawnSymbol: 140,
		topTokenWithdrawnUsd: 150,
		topTokenDepositedSymbol: 140,
		topTokenDepositedUsd: 150
	},
	480: {
		name: 180,
		netFlow: 140,
		prevDayUsdWithdrawals: 160,
		prevDayUsdDeposits: 160,
		topTokenWithdrawnSymbol: 140,
		topTokenWithdrawnUsd: 150,
		topTokenDepositedSymbol: 140,
		topTokenDepositedUsd: 150
	},
	1024: {
		name: 180,
		netFlow: 150,
		prevDayUsdWithdrawals: 160,
		prevDayUsdDeposits: 160,
		topTokenWithdrawnSymbol: 140,
		topTokenWithdrawnUsd: 150,
		topTokenDepositedSymbol: 140,
		topTokenDepositedUsd: 150
	}
}

export const largeTxsColumnSizes = {
	0: {
		date: 100,
		usdValue: 120,
		isDeposit: 140,
		symbol: 100,
		txHash: 160
	},
	480: {
		date: 100,
		usdValue: 120,
		isDeposit: 140,
		symbol: 120,
		txHash: 160
	},
	1024: {
		date: 140,
		usdValue: 120,
		isDeposit: 140,
		symbol: 120,
		txHash: 160
	}
}

export const bridgeTokensColumnSizes = {
	0: {
		symbol: 100,
		withdrawn: 120,
		deposited: 120,
		volume: 140
	},
	480: {
		symbol: 100,
		withdrawn: 120,
		deposited: 120,
		volume: 140
	},
	1024: {
		symbol: 100,
		withdrawn: 120,
		deposited: 120,
		volume: 140
	}
}

export const bridgeAddressesColumnSizes = {
	0: {
		address: 240,
		withdrawn: 120,
		deposited: 120,
		txs: 120
	},
	480: {
		address: 240,
		withdrawn: 120,
		deposited: 120,
		txs: 120
	},
	1024: {
		address: 240,
		withdrawn: 120,
		deposited: 120,
		txs: 120
	}
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
`
