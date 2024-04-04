import { SortingState, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import { Header } from '~/Theme'

import { ProtocolsChainsSearch } from '~/components/Search'
import { bridgedColumns, chainsColumn } from '~/components/Table/Defi/columns'
import VirtualTable from '~/components/Table/Table'
import { sluggify } from '~/utils/cache-client'

export default function ChainsContainer({ assets, chains, flows1d }) {
	const [sorting, setSorting] = React.useState<SortingState>([])

	const data = chains?.chainsUnique
		.map((chain) => {
			const slug = sluggify(chain)

			const chainAssets = assets?.[slug]
			const chainFlows = flows1d?.[slug]

			return {
				name: chain,
				...(chainAssets || {}),
				change_24h: chainFlows?.total
			}
		})
		.filter((row) => row?.total)

	const instance = useReactTable({
		data,
		columns: bridgedColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return (
		<>
			<ProtocolsChainsSearch
				hideFilters
				step={{
					category: 'Chains',
					name: 'All Chains'
				}}
			/>
			<Header>Bridged TVL for All chains</Header>
			<VirtualTable instance={instance} cellStyles={{ overflow: 'visible' }} />
		</>
	)
}
