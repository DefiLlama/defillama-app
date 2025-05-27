import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { INetProjectTreasuryByChain } from './queries'
import { TokenLogo } from '~/components/TokenLogo'
import { BasicLink } from '~/components/Link'
import { ColumnDef } from '@tanstack/react-table'
import { formattedNum } from '~/utils'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { Metrics } from '~/components/Metrics'

export function NetProjectTreasuryByChain(props: INetProjectTreasuryByChain) {
	return (
		<>
			<ProtocolsChainsSearch hideFilters />
			<Metrics currentMetric="Net Project Treasury" />
			<TableWithSearch
				data={props.protocols}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				header="Protocol Rankings"
			/>
		</>
	)
}

const columns: ColumnDef<INetProjectTreasuryByChain['protocols'][0]>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="flex flex-col -my-2">
						<BasicLink
							href={`/protocol/${row.original.slug}?borrowed=true`}
							className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{value}
						</BasicLink>
					</span>
				</span>
			)
		},
		size: 280
	},
	{
		id: 'netTreasury',
		header: 'Net Treasury',
		accessorFn: (protocol) => protocol.netTreasury,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: "Value of tokens owned by a protocol, excluding it's own token"
		},
		size: 128
	}
]
