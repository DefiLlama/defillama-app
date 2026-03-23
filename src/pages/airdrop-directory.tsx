import { createColumnHelper } from '@tanstack/react-table'
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

const columnHelper = createColumnHelper<IAirdropRow>()

const columns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		size: 120
	}),
	columnHelper.accessor('page', {
		header: 'Claim Page',
		size: 100,
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<a
					href={getValue()}
					target="_blank"
					rel="noopener noreferrer"
					className="flex shrink-0 items-center justify-center rounded-md bg-(--link-button) p-1.5 hover:bg-(--link-button-hover)"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
			) : null
	})
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
			title="Crypto Airdrop Directory - DeFi Airdrops - DefiLlama"
			description="Browse upcoming and past crypto airdrops across DeFi protocols on DefiLlama."
			canonicalUrl={`/airdrop-directory`}
		>
			<TableWithSearch
				data={airdrops}
				columns={columns}
				columnToSearch={'name'}
				placeholder={'Search Airdrop...'}
				header="Airdrop Directory"
				headingAs="h1"
				csvFileName="airdrop-directory"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</Layout>
	)
}
