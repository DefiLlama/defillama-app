import { ColumnDef } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { PROTOCOLS_API } from '~/constants'
import { ILiteProtocol } from '~/containers/ChainOverview/types'
import Layout from '~/layout'
import { chainIconUrl, slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'

export async function getStaticProps() {
	const [safeHarborProtocols, { protocols }]: [Record<string, boolean>, { protocols: Array<ILiteProtocol> }] =
		await Promise.all([fetchJson('https://api.llama.fi/_fe/static/safe-harbor-projects'), fetchJson(PROTOCOLS_API)])
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const protocolMetadata = metadataCache.protocolMetadata

	const tvlByProtocol = {}
	for (const protocol of protocols) {
		tvlByProtocol[protocol.defillamaId] = protocol.tvl
		if (protocol.parentProtocol) {
			tvlByProtocol[protocol.parentProtocol] = (tvlByProtocol[protocol.parentProtocol] ?? 0) + protocol.tvl
		}
	}

	const finalProtocols = []
	for (const protocolId in safeHarborProtocols) {
		if (safeHarborProtocols[protocolId] && protocolMetadata[protocolId]) {
			finalProtocols.push({
				defillamaId: protocolId,
				name: protocolMetadata[protocolId].displayName,
				slug: slug(protocolMetadata[protocolId].displayName),
				chains: protocolMetadata[protocolId].chains,
				logo: tokenIconUrl(protocolMetadata[protocolId].displayName),
				url: `https://safeharbor.securityalliance.org/database/${slug(protocolMetadata[protocolId].displayName)}`
			})
		}
	}

	return {
		props: {
			protocols: finalProtocols.sort(
				(a, b) => (tvlByProtocol[b.defillamaId] ?? 0) - (tvlByProtocol[a.defillamaId] ?? 0)
			)
		}
	}
}

const pageName = ['Safe Harbor Agreements']

export default function SafeHarborAgreements({ protocols }) {
	return (
		<Layout title="Safe Harbor Agreements" pageName={pageName}>
			<TableWithSearch
				data={protocols}
				columns={columns}
				placeholder={'Search protocols...'}
				columnToSearch={'name'}
				compact
			/>
		</Layout>
	)
}

const columns: ColumnDef<{ name: string; url: string; chains: string[]; slug: string; logo: string }>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
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

					<span className="shrink-0" onClick={row.getToggleExpandedHandler()}>
						{index + 1}
					</span>

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
