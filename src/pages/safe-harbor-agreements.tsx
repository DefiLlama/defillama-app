import { ColumnDef } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { getProtocolsByChain } from '~/containers/ChainOverview/queries.server'
import { IProtocol } from '~/containers/ChainOverview/types'
import Layout from '~/layout'
import { chainIconUrl, formattedNum, slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'

export async function getStaticProps() {
	const [safeHarborProtocols, { protocols }]: [Record<string, boolean>, { protocols: Array<IProtocol> }] =
		await Promise.all([
			fetchJson('https://api.llama.fi/_fe/static/safe-harbor-projects'),
			getProtocolsByChain({
				chain: 'All',
				metadata: { name: 'All', stablecoins: true, fees: true, dexs: true, perps: true, id: 'all' }
			})
		])
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const protocolMetadata = metadataCache.protocolMetadata

	const tvlByProtocol = {}
	const feesByProtocol = {}
	const revenueByProtocol = {}
	const dexVolumeByProtocol = {}
	for (const protocol of protocols) {
		tvlByProtocol[protocol.name] = protocol.tvl?.default?.tvl ?? null
		feesByProtocol[protocol.name] = protocol.fees?.total24h ?? null
		revenueByProtocol[protocol.name] = protocol.revenue?.total24h ?? null
		dexVolumeByProtocol[protocol.name] = protocol.dexs?.total24h ?? null
	}

	const finalProtocols = []
	for (const protocolId in safeHarborProtocols) {
		const pmetadata = protocolMetadata[protocolId]
		if (safeHarborProtocols[protocolId] && pmetadata) {
			finalProtocols.push({
				defillamaId: protocolId,
				name: pmetadata.displayName,
				slug: slug(pmetadata.displayName),
				chains: pmetadata.chains,
				logo: tokenIconUrl(pmetadata.displayName),
				url: `https://safeharbor.securityalliance.org/database/${slug(pmetadata.displayName)}`,
				tvl: tvlByProtocol[pmetadata.displayName] ?? null,
				fees: feesByProtocol[pmetadata.displayName] ?? null,
				revenue: revenueByProtocol[pmetadata.displayName] ?? null,
				dexVolume: dexVolumeByProtocol[pmetadata.displayName] ?? null
			})
		}
	}

	return {
		props: {
			protocols: finalProtocols.sort((a, b) => b.tvl - a.tvl)
		}
	}
}

const pageName = ['Safe Harbor Agreements']

export default function SafeHarborAgreements({ protocols }) {
	return (
		<Layout
			title="Safe Harbor Agreements - DefiLlama"
			description={`Safe Harbor Agreements by protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`safe harbor agreements, defi safe harbor agreements, safe harbor agreements by protocol`}
			canonicalUrl={`/safe-harbor-agreements`}
			pageName={pageName}
		>
			<TableWithSearch
				data={protocols}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				compact
				sortingState={[{ id: 'tvl', desc: true }]}
			/>
		</Layout>
	)
}

const columns: ColumnDef<{
	name: string
	url: string
	chains: string[]
	slug: string
	logo: string
	tvl: number
	fees: number
	revenue: number
	dexVolume: number
}>[] = [
	{
		id: 'rank',
		header: 'Rank',
		accessorKey: 'rank',
		size: 60,
		enableSorting: false,
		cell: ({ row }) => {
			const index = row.index
			return <span className="font-bold">{index + 1}</span>
		},
		meta: {
			align: 'center' as const
		}
	},
	{
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const Chains = () => (
				<span className="flex flex-col gap-1">
					{row.original.chains.map((chain) => (
						<span key={`/chain/${chain}/${row.original.slug}`} className="flex items-center gap-1">
							<TokenLogo logo={chainIconUrl(chain)} size={14} />
							<span>{chain}</span>
						</span>
					))}
				</span>
			)

			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-6' : 'pl-0'}`}>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-4.5"
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

					<TokenLogo logo={row.original.logo} data-lgonly />

					{row.original.chains.length ? (
						<span className="-my-2 flex flex-col">
							<BasicLink
								href={`/protocol/${row.original.slug}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								{value}
							</BasicLink>

							<Tooltip content={<Chains />} className="text-[0.7rem] text-(--text-disabled)">
								{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
							</Tooltip>
						</span>
					) : (
						<BasicLink
							href={`/protocol/${row.original.slug}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>
					)}
				</span>
			)
		},
		size: 280
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => (getValue() != null ? formattedNum(getValue() as number, true) : null),
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Fees',
		accessorKey: 'fees',
		cell: ({ getValue }) => (getValue() != null ? formattedNum(getValue() as number, true) : null),
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Revenue',
		accessorKey: 'revenue',
		cell: ({ getValue }) => (getValue() != null ? formattedNum(getValue() as number, true) : null),
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h DEX Volume',
		accessorKey: 'dexVolume',
		cell: ({ getValue }) => (getValue() != null ? formattedNum(getValue() as number, true) : null),
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Agreement',
		accessorKey: 'url',
		enableSorting: false,
		cell: ({ row }) => (
			<a
				href={row.original.url}
				target="_blank"
				rel="noopener noreferrer"
				className="flex shrink-0 items-center justify-center rounded-md bg-(--link-button) px-6 py-1.5 hover:bg-(--link-button-hover)"
			>
				<Icon name="arrow-up-right" height={14} width={14} />
				<span className="sr-only">open in new tab</span>
			</a>
		),
		meta: {
			align: 'end'
		}
	}
]
