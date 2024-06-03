import { SortingState, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import { Header } from '~/Theme'
import CSVDownloadButton from '~/components/ButtonStyled/CsvButton'

import { ProtocolsChainsSearch } from '~/components/Search'
import { bridgedColumns } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'

import { download } from '~/utils'
import { sluggify } from '~/utils/cache-client'

export default function ChainsContainer({ assets, chains, flows1d }) {
	const [sorting, setSorting] = React.useState<SortingState>([])

	const data = Object.keys(assets)
		.map((name) => {
			const chainAssets = assets?.[name]
			const chainFlows = flows1d?.[name]

			return {
				name,
				...(chainAssets || {}),
				change_24h: chainFlows?.total?.perc
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

	const onCSVDownload = () => {
		const csvData = data.map((row) => {
			return {
				Chain: row.name,
				Total: row.total?.total,
				Change_24h: row?.change_24h,
				Canonical: row?.canonical?.total,
				OwnTokens: row?.ownTokens?.total,
				ThirdParty: row?.thirdParty?.total,
				Native: row?.native?.total
			}
		})
		const headers = Object.keys(csvData[0])
		const csv = [headers.join(',')]
			.concat(csvData.map((row) => headers.map((header) => row[header]).join(',')))
			.join('\n')

		download('bridged-chains.csv', csv)
	}

	return (
		<>
			<ProtocolsChainsSearch
				hideFilters
				step={{
					category: 'Chains',
					name: 'All Chains'
				}}
			/>
			<Header style={{ display: 'flex', justifyContent: 'space-between' }}>
				Bridged TVL for All chains <CSVDownloadButton onClick={onCSVDownload} />
			</Header>
			<TableWithSearch
				data={data}
				columns={bridgedColumns}
				placeholder={'Search chains...'}
				columnToSearch={['name']}
			/>
		</>
	)
}
