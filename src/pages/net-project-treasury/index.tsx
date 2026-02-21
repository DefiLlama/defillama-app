import type { ColumnDef } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { getNetProjectTreasuryData } from '~/containers/Treasuries/queries'
import type { INetProjectTreasury } from '~/containers/Treasuries/types'
import Layout from '~/layout'
import { formattedNum } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`net-project-treasury/index`, async () => {
	const protocols = await getNetProjectTreasuryData()
	return {
		props: { protocols },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Net Project Treasury']
const DEFAULT_SORTING_STATE = [{ id: 'netTreasury', desc: true }]

const NetProjectTreasuries = (props) => {
	return (
		<Layout
			title={`Net Project Treasury - DefiLlama`}
			description={`Net Project Treasury by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`net project treasury, defi net project treasury`}
			canonicalUrl={`/net-project-treasury`}
			pageName={pageName}
		>
			<TableWithSearch
				data={props.protocols}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				header="Protocol Rankings"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</Layout>
	)
}

const columns: ColumnDef<INetProjectTreasury>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue() as string

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo logo={row.original.logo} data-lgonly />

					<span className="-my-2 flex flex-col">
						<BasicLink
							href={`/protocol/treasury/${row.original.slug}`}
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
		id: 'netTreasury',
		header: 'Net Treasury',
		accessorFn: (protocol) => protocol.netTreasury,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		meta: {
			align: 'end',
			headerHelperText: "Value of tokens owned by a protocol, excluding it's own token"
		},
		size: 128
	}
]

export default NetProjectTreasuries
