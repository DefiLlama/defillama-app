import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, slug } from '~/utils'

export interface INftChainRow {
	name: string
	logo: string
	total24h: number
}

interface INftsByChainProps {
	chains: INftChainRow[]
}

export function NftsByChain({ chains }: INftsByChainProps) {
	return (
		<TableWithSearch
			data={chains}
			columns={columns}
			placeholder={'Search protocols...'}
			columnToSearch={'name'}
			header="Protocol Rankings"
			sortingState={DEFAULT_SORTING_STATE}
		/>
	)
}

const DEFAULT_SORTING_STATE: SortingState = [{ id: 'total24h', desc: true }]

const columns: ColumnDef<INftChainRow>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorFn: (chain) => chain.name,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue<string>()

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo logo={row.original.logo} data-lgonly />

					<BasicLink
						href={`/chain/${slug(value)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{value}
					</BasicLink>
				</span>
			)
		},
		size: 280
	},
	{
		id: 'total24h',
		header: 'NFT Volume 24h',
		accessorFn: (chain) => chain.total24h,
		cell: (info) => {
			const value = info.getValue<number>()
			return <>{value != null ? formattedNum(value, true) : null}</>
		},
		meta: {
			align: 'end',
			headerHelperText: 'Sum of volume across all NFT exchanges on the chain in the last 24 hours'
		},
		size: 128
	}
]
