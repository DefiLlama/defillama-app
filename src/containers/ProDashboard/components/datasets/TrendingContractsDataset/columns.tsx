import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { formattedPercent } from '~/utils'

interface ITrendingContracts {
	accounts_percentage_growth: number
	active_accounts: number
	contract: string
	gas_spend: number
	gas_spend_percentage_growth: number
	txns: number
	txns_percentage_growth: number
	name?: string
}

export const trendingContractsColumns = (chain: string): ColumnDef<ITrendingContracts>[] => [
	{
		header: 'Contract',
		accessorKey: 'contract',
		size: 280,
		enableSorting: false,
		cell: ({ row }) => {
			const value = row.original.contract
			const name = row.original.name
			const explorerUrl = `https://${
				chain === 'ethereum'
					? 'etherscan.io'
					: chain === 'arbitrum'
						? 'arbiscan.io'
						: chain === 'optimism'
							? 'optimistic.etherscan.io'
							: chain === 'base'
								? 'basescan.org'
								: 'polygonscan.com'
			}/address/${value}`

			return (
				<a
					href={explorerUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-3 text-blue-600 hover:underline dark:text-blue-400"
				>
					<span className="font-medium">{name || `${value.slice(0, 4)}...${value.slice(-4)}`}</span>
				</a>
			)
		}
	},
	{
		header: 'Transactions',
		accessorKey: 'txns',
		size: 120,
		cell: ({ getValue }) => <span className="pro-text1 font-mono">{(getValue() as number).toLocaleString()}</span>
	},
	{
		header: 'Tx Growth',
		accessorKey: 'txns_percentage_growth',
		size: 100,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return (
				<span className={`font-mono ${value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'pro-text2'}`}>
					{formattedPercent(value)}
				</span>
			)
		}
	},
	{
		header: 'Active Accounts',
		accessorKey: 'active_accounts',
		size: 140,
		cell: ({ getValue }) => <span className="pro-text1 font-mono">{(getValue() as number).toLocaleString()}</span>
	},
	{
		header: 'Account Growth',
		accessorKey: 'accounts_percentage_growth',
		size: 120,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return (
				<span className={`font-mono ${value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'pro-text2'}`}>
					{formattedPercent(value)}
				</span>
			)
		}
	},
	{
		header: 'Gas Spent',
		accessorKey: 'gas_spend',
		size: 120,
		cell: ({ getValue }) => <span className="pro-text1 font-mono">{(getValue() as number)?.toFixed(2)} ETH</span>
	},
	{
		header: 'Gas Growth',
		accessorKey: 'gas_spend_percentage_growth',
		size: 100,
		cell: ({ getValue }) => {
			const value = getValue() as number
			return (
				<span className={`font-mono ${value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'pro-text2'}`}>
					{formattedPercent(value)}
				</span>
			)
		}
	}
]
