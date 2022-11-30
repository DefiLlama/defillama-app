import { useState } from 'react'
import { ColumnDef, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import styled from 'styled-components'
import useSWR from 'swr'
import Layout from '~/layout'
import { Panel } from '~/components'
import { ProtocolsChainsSearch } from '~/components/Search'
import { TableFilters, TableHeader } from '~/components/Table/shared'
import VirtualTable from '~/components/Table/Table'
import { useDebounce } from '~/hooks'
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

async function getContracts(time: number) {
	return await fetch(`https://trending-contracts-api.herokuapp.com/ethereum/${time > 119 ? 119 : time}`).then((res) =>
		res.json()
	).then(async r=>{
		return {
			results: await Promise.all(r.map(async contract=>{
					let name = undefined;
					try{
						name = await fetch(`https://raw.githubusercontent.com/verynifty/RolodETH/main/data/${contract.contract.toLowerCase()}`).then(r=>r.json())
						if(name.name === undefined){
							throw new Error("RolodETH: No name")
						}
					} catch(e){
						try{
							name = await fetch(`https://api.llama.fi/contractName/${contract.contract.toLowerCase()}`).then(r=>r.json())
							if(name.name === ""){
								throw new Error("Etherescan: Contract not verified")
							}
						} catch(e){
							name = undefined
						}
					}
					return {
						...contract,
						name: name?.name
					}
			}))
		}
	})
}

export default function TrendingContracts() {
	const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: 'gas_spend' }])

	const [value, setValue] = useState<number>(60)

	const time = useDebounce(value, 500)

	const { data, error } = useSWR(`trendingcontracts${time}`, () => getContracts(time))

	const results = data?.results ?? []

	const instance = useReactTable({
		data: results,
		state: {
			sorting
		},
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel()
	})

	return (
		<Layout title={`Trending Contracts - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Trending Contracts', hideOptions: true }} />

			<TableFilters>
				<TableHeader>
					<span>Trending Contracts last </span>{' '}
					<Input
						type="number"
						value={value}
						onChange={(e) => {
							const newValue = Number(e.target.value)
							if (!Number.isNaN(newValue) && newValue <= 120) {
								setValue(newValue)
							}
						}}
						min={0}
						max={120}
						title="Enter only numbers between 0 and 120."
					/>{' '}
					<span>minutes</span>
				</TableHeader>
			</TableFilters>

			{!data && !error ? (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Loading...
				</Panel>
			) : error ? (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Sorry, couldn't fetch trending contracts.
				</Panel>
			) : (
				<VirtualTable instance={instance} />
			)}
		</Layout>
	)
}

export const columns: ColumnDef<ITrendingContracts>[] = [
	{
		header: 'Contract',
		accessorKey: 'contract',
		cell: (info) => {
			const value = info.getValue() as string
			const name = info.row.original.name
			return (
				<a
					href={`https://etherscan.io/address/${value}`}
					target="_blank"
					rel="noopener noreferrer"
					style={{ textDecoration: 'underline' }}
				>
					{name ?? value.slice(0, 4) + '...' + value.slice(-4)}
				</a>
			)
		},
		enableSorting: false
	},
	{
		header: 'Transactions',
		accessorKey: 'txns',
		cell: (info) => <>{info.getValue()}</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Tx Growth',
		accessorKey: 'txns_percentage_growth',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Active Accounts',
		accessorKey: 'active_accounts',
		cell: (info) => <>{info.getValue()}</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Account Growth',
		accessorKey: 'accounts_percentage_growth',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Gas Spent',
		accessorKey: 'gas_spend',
		cell: (info) => <>{(info.getValue() as number)?.toFixed(2)} ETH</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Gas Growth',
		accessorKey: 'gas_spend_percentage_growth',
		cell: (info) => <>{formattedPercent(info.getValue(), false, 400)}</>,
		meta: {
			align: 'end'
		}
	},
]

const Input = styled.input`
	padding: 4px 6px;
	background: ${({ theme }) => theme.bg6};
	color: ${({ theme }) => theme.text1};
	border: none;
	border-radius: 4px;
	width: 60px;
`
