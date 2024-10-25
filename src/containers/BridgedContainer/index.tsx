import * as React from 'react'
import CSVDownloadButton from '~/components/ButtonStyled/CsvButton'

import { ProtocolsChainsSearch } from '~/components/Search'
import { bridgedColumns } from '~/components/Table/Defi/columns'
import { TableWithSearch } from '~/components/Table/TableWithSearch'

import { download } from '~/utils'

export default function ChainsContainer({ assets, chains, flows1d }) {
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
			<h1 className="text-2xl font-medium -mb-5 flex items-center justify-between flex-wrap gap-3">
				<span>Bridged TVL for All chains</span>
				<CSVDownloadButton onClick={onCSVDownload} />
			</h1>
			<TableWithSearch
				data={data}
				columns={bridgedColumns}
				placeholder={'Search chains...'}
				columnToSearch={['name']}
			/>
		</>
	)
}
