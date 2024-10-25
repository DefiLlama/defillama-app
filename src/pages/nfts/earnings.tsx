import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getNFTCollectionEarnings } from '~/api/categories/nfts'
import { NFTsSearch } from '~/components/Search'
import { withPerformanceLogging } from '~/utils/perf'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { ColumnDef } from '@tanstack/react-table'
import { AccordionButton, Name } from '~/components/Table/shared'
import { formattedNum } from '~/utils'
import TokenLogo, { FallbackLogo } from '~/components/TokenLogo'
import Link from '~/components/Link'
import { Icon } from '~/components/Icon'

export const getStaticProps = withPerformanceLogging('nfts/marketplaces', async () => {
	const data = await getNFTCollectionEarnings()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

function Earnings({ earnings }) {
	//x
	return (
		<Layout title="NFT Earnings - DefiLlama" defaultSEO>
			<NFTsSearch
				step={{
					category: 'Home',
					name: 'NFT Earnings',
					route: '',
					hideOptions: true
				}}
			/>

			<h1 className='text-2xl font-medium -mb-5'>NFTs Earnings</h1>

			<TableWithSearch
				data={earnings}
				columns={earningsColumns}
				columnToSearch={'name'}
				placeholder={'Search collections...'}
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
		header: () => <Name>Name</Name>,
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const logo = row.original.logo ?? row.subRows?.[0]?.original?.logo

			return (
				<Name depth={row.depth}>
					{row.subRows?.length > 0 ? (
						<AccordionButton
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<Icon name="chevron-down" height={16} width={16} />
							) : (
								<Icon name="chevron-right" height={16} width={16} />
							)}
						</AccordionButton>
					) : null}

					<span>{index + 1}</span>

					{logo ? <TokenLogo logo={logo} data-lgonly /> : <FallbackLogo />}

					{row.subRows?.length === 0 ? (
						<Link href={`royalties/${row.original.defillamaId}`}>
							<span>{value}</span>
						</Link>
					) : (
						<span>{value}</span>
					)}
				</Name>
			)
		},
		size: 240
	},
	{
		header: 'Mint Earnings',
		accessorKey: 'totalMintEarnings',
		cell: (info) => {
			return <>{info.getValue() ? '$' + formattedNum(info.getValue()) : null}</>
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
			return <>{info.getValue() ? '$' + formattedNum(info.getValue()) : null}</>
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
			return <>{info.getValue() ? '$' + formattedNum(info.getValue()) : null}</>
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
			return <>{info.getValue() ? '$' + formattedNum(info.getValue()) : null}</>
		},
		meta: {
			align: 'end',
			headerHelperText: 'mint + royalties'
		},
		size: 120
	}
]

export default Earnings
