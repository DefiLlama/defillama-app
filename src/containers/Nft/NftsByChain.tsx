import { createColumnHelper, type SortingState } from '@tanstack/react-table'
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
			headingAs="h1"
			csvFileName="nft-chains"
			sortingState={DEFAULT_SORTING_STATE}
		/>
	)
}

const DEFAULT_SORTING_STATE: SortingState = [{ id: 'total24h', desc: true }]
const columnHelper = createColumnHelper<INftChainRow>()

const columns = [
	columnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo src={row.original.logo} data-lgonly />

					<BasicLink
						href={`/chain/${slug(value)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{value}
					</BasicLink>
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[min(280px,40vw)]'
		}
	}),
	columnHelper.accessor('total24h', {
		id: 'total24h',
		header: 'NFT Volume 24h',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[128px]',
			align: 'end',
			headerHelperText: 'Sum of volume across all NFT exchanges on the chain in the last 24 hours'
		}
	})
]
