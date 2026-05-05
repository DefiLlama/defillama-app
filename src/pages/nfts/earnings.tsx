import { createColumnHelper } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { FallbackLogo, TokenLogo } from '~/components/TokenLogo'
import { getNFTCollectionEarnings } from '~/containers/Nft/queries'
import Layout from '~/layout'
import { formattedNum } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('nfts/earnings', async () => {
	const data = await getNFTCollectionEarnings()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Earnings', 'by', 'NFTs']
const DEFAULT_SORTING_STATE = [{ id: 'totalEarnings', desc: true }]

function Earnings({ earnings }) {
	return (
		<Layout
			title="NFT Creator Earnings & Royalties - DefiLlama"
			description="Track NFT creator earnings and royalty revenue by collection. Compare royalty income across top NFT collections on DefiLlama."
			canonicalUrl={`/nfts/earnings`}
			pageName={pageName}
		>
			<TableWithSearch
				data={earnings}
				columns={earningsColumns}
				columnToSearch={'name'}
				placeholder={'Search collections...'}
				header="NFT Collection Earnings"
				headingAs="h1"
				csvFileName="nft-earnings"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</Layout>
	)
}

interface IEarnings {
	defillamaId: string
	name: string
	logo?: string
	displayName: string
	chains: Array<string>
	total24h: number | null
	total7d: number | null
	total30d: number | null
	totalRoyaltyEarnings: number | null
	totalMintEarnings: number | null
	totalEarnings: number | null
}

const columnHelper = createColumnHelper<IEarnings>()

const earningsColumns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()

			const logo = row.original.logo ?? row.subRows?.[0]?.original?.logo

			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-0.5"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							)}
						</button>
					) : null}

					<span className="vf-row-index shrink-0" aria-hidden="true" />

					{logo ? <TokenLogo src={logo} alt={`Logo of ${value}`} data-lgonly /> : <FallbackLogo />}

					{row.subRows?.length === 0 ? (
						<a
							className="overflow-hidden text-ellipsis whitespace-nowrap text-(--blue) hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							href={`royalties/${row.original.defillamaId}`}
						>
							<span>{value}</span>
						</a>
					) : (
						<span>{value}</span>
					)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[min(240px,40vw)]'
		}
	}),
	columnHelper.accessor('totalMintEarnings', {
		header: 'Mint Earnings',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[100px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('totalRoyaltyEarnings', {
		header: 'Lifetime Royalty Earnings',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('total30d', {
		header: 'Royalties 30d',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[80px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('totalEarnings', {
		header: 'Total Lifetime Earnings',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end',
			headerHelperText: 'mint + royalties'
		}
	})
]

export default Earnings
