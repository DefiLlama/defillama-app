import { maxAgeForNext } from '~/api'
import { BasicLink } from '~/components/Link'
import { Metrics } from '~/components/Metrics'
import { NFTsSearch } from '~/components/Search/NFTs'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import Layout from '~/layout'
import { chainIconUrl, formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'
import { TEMP_CHAIN_NFTS } from '~/constants'

export const getStaticProps = withPerformanceLogging(`nfts/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const data = (await fetchJson(TEMP_CHAIN_NFTS)) as Promise<Record<string, number>>

	if (!data) return { notFound: true }

	const chains = []
	for (const chain in data) {
		const name =
			metadataCache.chainMetadata[
				chain === 'optimism' ? 'op-mainnet' : chain === 'immutablex' ? 'immutable-zkevm' : chain
			]?.name
		chains.push({
			name,
			logo: chainIconUrl(chain),
			total24h: data[chain]
		})
	}

	return {
		props: { chains: chains.sort((a, b) => b.total24h - a.total24h) },
		revalidate: maxAgeForNext([22])
	}
})

export default function NftsOnAllChains(props) {
	return (
		<Layout title="NFTs - DefiLlama">
			<NFTsSearch />
			<Metrics currentMetric="NFT Volume" isChains />
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

const columns = [
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
					<span className="shrink-0">{index + 1}</span>

					<TokenLogo logo={row.original.logo} data-lgonly />

					<BasicLink
						href={`/chain/${slug(value)}`}
						className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{value}
					</BasicLink>
				</span>
			)
		},
		size: 280
	},
	{
		id: 'total24h',
		header: 'NFT Volume 24h',
		accessorFn: (protocol) => protocol.total24h,
		cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
		sortUndefined: 'last',
		meta: {
			align: 'end',
			headerHelperText: 'Sum of volume across all NFT exchanges on the chain in the last 24 hours'
		},
		size: 128
	}
]
