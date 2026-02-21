import type { ColumnDef } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { getAirdropDirectoryData } from '~/containers/Protocols/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const DEFAULT_SORTING_STATE = [{ id: 'name', desc: true }]

interface IAirdropRow {
	name: string
	page: string
}

const columns: ColumnDef<IAirdropRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		size: 120
	},
	{
		header: 'Claim Page',
		accessorKey: 'page',
		size: 100,
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<a
					href={getValue() as string}
					target="_blank"
					rel="noopener noreferrer"
					className="flex shrink-0 items-center justify-center rounded-md bg-(--link-button) p-1.5 hover:bg-(--link-button-hover)"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
			) : null
	}
]

export const getStaticProps = withPerformanceLogging('airdrop-directory', async () => {
	const airdrops = await getAirdropDirectoryData()

	return {
		props: { airdrops },
		revalidate: maxAgeForNext([22])
	}
})

export default function Airdrops({ airdrops }) {
	return (
		<Layout
			title={`Airdrop Directory - DefiLlama`}
			description={`Airdrop directory on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`airdrop directory, airdrops`}
			canonicalUrl={`/airdrop-directory`}
		>
			<TableWithSearch
				data={airdrops}
				columns={columns}
				columnToSearch={'name'}
				placeholder={'Search Airdrop...'}
				csvFileName="airdrop-directory.csv"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</Layout>
	)
}
