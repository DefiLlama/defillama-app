import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { BasicLink } from '~/components/Link'
import { Metrics } from '~/components/Metrics'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByREVPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByREVPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { formattedNum } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByREVPageData()

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const REVByChain = (props: IChainsByREVPageData) => {
	return (
		<Layout title="REV by chain - DefiLlama">
			<ProtocolsChainsSearch hideFilters />
			<Metrics currentMetric="REV" />
			<TableWithSearch
				data={props.chains}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				header="Protocol Rankings"
			/>
		</Layout>
	)
}

const columns: ColumnDef<IChainsByREVPageData['chains'][0]>[] = [
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
							href={`/chain/${row.original.slug}`}
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
		id: 'total24h',
		header: 'REV 24h',
		accessorFn: (protocol) => protocol.total24h,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Chain fees and MEV tips in the last 24 hours'
		},
		size: 128
	},
	{
		id: 'total30d',
		header: 'REV 30d',
		accessorFn: (protocol) => protocol.total30d,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Chain fees and MEV tips in the last 30 days'
		},
		size: 128
	}
]

export default REVByChain
