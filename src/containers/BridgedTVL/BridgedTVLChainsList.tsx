import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { CustomLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { ColumnDef } from '@tanstack/react-table'
import { chainIconUrl, download, formattedNum, slug } from '~/utils'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

export function BridgedTVLChainsList({ assets, chains, flows1d }) {
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
		.sort((a, b) => b.total.total - a.total.total)

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
			<ProtocolsChainsSearch />
			<RowLinksWithDropdown links={chains} activeLink="All" />
			<div className="bg-[var(--cards-bg)] rounded-md">
				<TableWithSearch
					data={data}
					columns={bridgedColumns}
					placeholder={'Search chains...'}
					columnToSearch={['name']}
					customFilters={
						<>
							<CSVDownloadButton onClick={onCSVDownload} className="min-h-[34px]" />
						</>
					}
				/>
			</div>
		</>
	)
}

interface IBridgedRow {
	name: string
	total?: { total?: string }
	thirdParty?: { total?: string }
	canonical?: { total?: string }
	ownTokens?: { total?: string }
	native?: { total?: string }
	change_24h: number
}

const bridgedColumns: ColumnDef<IBridgedRow>[] = [
	{
		header: () => 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>
					<TokenLogo logo={chainIconUrl(getValue())} />
					<CustomLink
						href={`/bridged/${slug(getValue() as string)}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as any}
					</CustomLink>
				</span>
			)
		},
		size: 200
	},
	{
		header: 'Total Bridged',
		accessorKey: 'total',
		accessorFn: (row) => row.total?.total ?? undefined,
		cell: (info: any) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'Total value of assets on the chain, excluding own tokens' }
	},
	{
		header: 'Native',
		accessorKey: 'native',
		accessorFn: (row) => row.native?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'Assets minted natively on the chain' }
	},
	{
		header: 'Canonical',
		accessorKey: 'canonical',
		accessorFn: (row) => row.canonical?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'Assets bridged through the official canonical bridge' }
	},
	{
		header: 'Own Tokens',
		accessorKey: 'ownTokens',
		accessorFn: (row) => row.ownTokens?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'The chains own token, either for gas or for governance ' }
	},
	{
		header: 'Third Party',
		accessorKey: 'thirdParty',
		accessorFn: (row) => row.thirdParty?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>${formattedNum(value)}</>
		},
		sortUndefined: 'last',
		meta: { align: 'end', headerHelperText: 'Assets bridged through bridges that aren’t the canonical bridge' }
	}
]
