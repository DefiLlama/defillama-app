import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { BasicLink } from '~/components/Link'
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

const pageName = ['Chains', 'ranked by', 'REV']

const REVByChain = (props: IChainsByREVPageData) => {
	return (
		<Layout
			title="REV by chain - DefiLlama"
			description={`REV by chain. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`rev by chain, defi rev by chain`}
			canonicalUrl={`/rev/chains`}
			pageName={pageName}
		>
			<TableWithSearch
				data={props.chains}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				header="Protocol Rankings"
				rowSize={64}
				compact
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
				<span className="relative flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="-my-2 flex flex-col">
						<BasicLink
							href={`/chain/${row.original.slug}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
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
			align: 'center',
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
			align: 'center',
			headerHelperText: 'Chain fees and MEV tips in the last 30 days'
		},
		size: 128
	}
]

export default REVByChain
