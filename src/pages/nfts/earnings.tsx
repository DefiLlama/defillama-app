import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { getNFTCollectionEarnings } from '~/api/categories/nfts'
import { Icon } from '~/components/Icon'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { FallbackLogo, TokenLogo } from '~/components/TokenLogo'
import Layout from '~/layout'
import { formattedNum } from '~/utils'
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

function Earnings({ earnings }) {
	//x
	return (
		<Layout title="NFT Earnings - DefiLlama" pageName={pageName}>
			<TableWithSearch
				data={earnings}
				columns={earningsColumns}
				columnToSearch={'name'}
				placeholder={'Search collections...'}
				header="NFT Collection Earnings"
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

const earningsColumns: ColumnDef<IEarnings>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const logo = row.original.logo ?? row.subRows?.[0]?.original?.logo

			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-[2px]"
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

					<span className="shrink-0">{index + 1}</span>

					{logo ? <TokenLogo logo={logo} data-lgonly /> : <FallbackLogo />}

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
		size: 240
	},
	{
		header: 'Mint Earnings',
		accessorKey: 'totalMintEarnings',
		cell: (info) => {
			return <>{info.getValue() ? formattedNum(info.getValue(), true) : null}</>
		},
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: 'Lifetime Royalty Earnings',
		accessorKey: 'totalRoyaltyEarnings',
		cell: (info) => {
			return <>{info.getValue() ? formattedNum(info.getValue(), true) : null}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Royalties 30d',
		accessorKey: 'total30d',
		cell: (info) => {
			return <>{info.getValue() ? formattedNum(info.getValue(), true) : null}</>
		},
		meta: {
			align: 'end'
		},
		size: 80
	},
	{
		header: 'Total Lifetime Earnings',
		accessorKey: 'totalEarnings',
		cell: (info) => {
			return <>{info.getValue() ? formattedNum(info.getValue(), true) : null}</>
		},
		meta: {
			align: 'end',
			headerHelperText: 'mint + royalties'
		},
		size: 120
	}
]

export default Earnings
