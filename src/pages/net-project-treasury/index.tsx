import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { PROTOCOLS_TREASURY } from '~/constants'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

interface INetProjectTreasuryByChain {
	protocols: Array<{ name: string; logo: string; slug: string; netTreasury: number }>
}

export const getStaticProps = withPerformanceLogging(`net-project-treasury/index`, async () => {
	const treasuries = await fetchJson(PROTOCOLS_TREASURY)

	const protocols = treasuries
		.map((t) => {
			let netTreasury = 0
			for (const category in t.tokenBreakdowns) {
				if (category !== 'ownTokens') {
					netTreasury += t.tokenBreakdowns[category]
				}
			}
			const name = t.name.replace(' (treasury)', '')
			return {
				name,
				logo: `${t.logo.replace('https://icons.llama.fi', 'https://icons.llamao.fi/icons/protocols')}?w=48&h=48`,
				slug: slug(name),
				netTreasury
			}
		})
		.filter((t) => t.netTreasury > 0)
		.sort((a, b) => b.netTreasury - a.netTreasury)

	return {
		props: { protocols },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Net Project Treasury']

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
				sortingState={[{ id: 'netTreasury', desc: true }]}
			/>
		</Layout>
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
				<span className="relative flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>

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
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: "Value of tokens owned by a protocol, excluding it's own token"
		},
		size: 128
	}
]

export default NetProjectTreasuries
