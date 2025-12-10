import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import { LocalLoader } from '~/components/Loaders'
import { VirtualTable } from '~/components/Table/Table'
import { TagGroup } from '~/components/TagGroup'
import Layout from '~/layout'
import { formattedPercent } from '~/utils'
import { fetchJson } from '~/utils/async'

const valueToFilter = {
	'1d': 'day',
	'7d': 'week',
	'30d': 'month'
}

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

async function getContracts(chain: string, time: string) {
	return await fetchJson(
		`https://trending-contracts-api.onrender.com/${chain}_tc/${valueToFilter[time] || valueToFilter['1d']}`
	).then(async (r) => {
		return {
			results: await Promise.all(
				r.map(async (contract) => {
					let name = contract.name ? { name: contract.name } : undefined
					if (!name) {
						try {
							name = await fetchJson(
								`https://raw.githubusercontent.com/verynifty/RolodETH/main/data/${contract.contract.toLowerCase()}`
							)
							if (name.name === undefined) {
								throw new Error('RolodETH: No name')
							}
						} catch (e) {
							try {
								name = await fetchJson(`https://api.llama.fi/contractName2/${chain}/${contract.contract.toLowerCase()}`)
								if (name.name === '') {
									throw new Error('Etherescan: Contract not verified')
								}
							} catch (e) {
								name = undefined
							}
						}
					}
					return {
						...contract,
						name: name?.name
					}
				})
			)
		}
	})
}

export default function TrendingContracts() {
	const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: 'gas_spend' }])

	const [value, setValue] = useState('1d')
	const [chain, setChain] = useState('Ethereum')

	const time = useDeferredValue(value)

	const activeChain = typeof chain === 'string' ? chain.toLowerCase() : 'ethereum'

	const { data, isLoading, error } = useQuery({
		queryKey: [`trending-contracts-${time}${activeChain}`],
		queryFn: () => getContracts(activeChain, time),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const results = data?.results ?? []

	const instance = useReactTable({
		data: results,
		state: {
			sorting
		},
		columns: columns(activeChain),
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel()
	})

	return (
		<Layout
			title={`Trending Contracts - DefiLlama`}
			description={`Trending Contracts on chain. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`trending contracts, defi trending contracts, trending contracts on chain`}
			canonicalUrl={`/trending-contracts`}
		>
			<div className="flex flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center gap-5 p-3">
					<h1 className="mr-auto text-xl font-semibold">Trending Contracts</h1>
					<TagGroup selectedValue={value} setValue={(val: string) => setValue(val)} values={['1d', '7d', '30d']} />
					<TagGroup
						selectedValue={chain}
						setValue={(val: string) => setChain(val)}
						values={['Ethereum', 'Arbitrum', 'Polygon', 'Optimism', 'Base']}
					/>
				</div>
				{isLoading ? (
					<div className="my-auto flex min-h-[360px] flex-1 items-center justify-center">
						<LocalLoader />
					</div>
				) : error ? (
					<p className="my-auto p-3 text-center">Sorry, couldn't fetch trending contracts.</p>
				) : (
					<VirtualTable instance={instance} />
				)}
			</div>
		</Layout>
	)
}

const columns = (chain: string) =>
	[
		{
			header: 'Contract',
			accessorKey: 'contract',
			cell: (info) => {
				const value = info.getValue() as string
				const name = info.row.original.name
				return (
					<a
						href={`https://${
							chain === 'ethereum'
								? 'etherscan.io'
								: chain === 'arbitrum'
									? 'arbiscan.io'
									: chain === 'optimism'
										? 'optimistic.etherscan.io'
										: chain === 'base'
											? 'basescan.org'
											: 'polygonscan.com'
						}/address/${value}`}
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
			meta: {
				align: 'end'
			}
		},
		{
			header: 'Tx Growth',
			accessorKey: 'txns_percentage_growth',
			cell: (info) => <>{formattedPercent(info.getValue())}</>,
			meta: {
				align: 'end'
			}
		},
		{
			header: 'Active Accounts',
			accessorKey: 'active_accounts',
			meta: {
				align: 'end'
			}
		},
		{
			header: 'Account Growth',
			accessorKey: 'accounts_percentage_growth',
			cell: (info) => <>{formattedPercent(info.getValue())}</>,
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
			cell: (info) => <>{formattedPercent(info.getValue())}</>,
			meta: {
				align: 'end'
			}
		}
	] as ColumnDef<ITrendingContracts>[]
