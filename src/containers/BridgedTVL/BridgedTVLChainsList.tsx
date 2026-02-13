import type { ColumnDef } from '@tanstack/react-table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IBridgedRow } from './types'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, slug } from '~/utils'
import type { RawChainsAssetsResponse, RawChainAssetsFlowEntry } from './api.types'

interface BridgedTVLChainsListProps {
	assets: RawChainsAssetsResponse
	chains: Array<{ label: string; to: string }>
	flows1d: Record<string, RawChainAssetsFlowEntry> | null
}

const DEFAULT_SORTING_STATE = [{ id: 'total', desc: true }]

export function BridgedTVLChainsList({ assets, chains, flows1d }: BridgedTVLChainsListProps) {
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
		.sort((a, b) => Number(b.total.total) - Number(a.total.total))

	const prepareCsv = () => {
		const csvData: Record<string, string | number | undefined>[] = data.map((row) => {
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
		const rows = [headers].concat(csvData.map((row) => headers.map((header) => String(row[header] ?? ''))))

		return { filename: 'bridged-chains.csv', rows }
	}

	return (
		<>
			<RowLinksWithDropdown links={chains} activeLink="All" />
			<TableWithSearch
				data={data}
				columns={bridgedColumns}
				placeholder={'Search chains...'}
				columnToSearch={'name'}
				customFilters={
					<>
						<CSVDownloadButton prepareCsv={prepareCsv} smol />
					</>
				}
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

const bridgedColumns: ColumnDef<IBridgedRow>[] = [
	{
		header: () => 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={chainIconUrl(getValue<string>())} />
					<BasicLink
						href={`/bridged/${slug(getValue<string>())}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{String(getValue())}
					</BasicLink>
				</span>
			)
		},
		size: 200
	},
	{
		header: 'Total Bridged',
		accessorKey: 'total',
		accessorFn: (row) => row.total?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'Total value of assets on the chain, excluding own tokens' }
	},
	{
		header: 'Native',
		accessorKey: 'native',
		accessorFn: (row) => row.native?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'Assets minted natively on the chain' }
	},
	{
		header: 'Canonical',
		accessorKey: 'canonical',
		accessorFn: (row) => row.canonical?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'Assets bridged through the official canonical bridge' }
	},
	{
		header: 'Own Tokens',
		accessorKey: 'ownTokens',
		accessorFn: (row) => row.ownTokens?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'The chains own token, either for gas or for governance ' }
	},
	{
		header: 'Third Party',
		accessorKey: 'thirdParty',
		accessorFn: (row) => row.thirdParty?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'Assets bridged through bridges that aren’t the canonical bridge' }
	}
]
