import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, slug } from '~/utils'
import type { RawChainsAssetsResponse, RawChainAssetsFlowEntry } from './api.types'
import type { IBridgedRow } from './types'

interface BridgedTVLChainsListProps {
	assets: RawChainsAssetsResponse
	chains: Array<{ label: string; to: string }>
	flows1d: Record<string, RawChainAssetsFlowEntry> | null
}

const DEFAULT_SORTING_STATE = [{ id: 'total', desc: true }]

export function BridgedTVLChainsList({ assets, chains, flows1d }: BridgedTVLChainsListProps) {
	const data = useMemo(() => {
		const rows: IBridgedRow[] = []
		for (const name in assets) {
			const chainAssets = assets[name]
			if (!chainAssets?.total) continue

			const chainFlows = flows1d?.[name]
			rows.push({
				name,
				...chainAssets,
				change_24h: chainFlows?.total?.perc
			})
		}
		rows.sort((a, b) => Number(b.total?.total ?? 0) - Number(a.total?.total ?? 0))
		return rows
	}, [assets, flows1d])

	return (
		<>
			<RowLinksWithDropdown links={chains} activeLink="All" />
			<TableWithSearch
				data={data}
				columns={bridgedColumns}
				placeholder={'Search chains...'}
				columnToSearch={'name'}
				csvFileName="bridged-chains.csv"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

const bridgedColumns: ColumnDef<IBridgedRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue<string>()
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={chainIconUrl(value)} />
					<BasicLink
						href={`/bridged/${slug(value)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{value}
					</BasicLink>
				</span>
			)
		},
		size: 200
	},
	{
		header: 'Total Bridged',
		accessorKey: 'total',
		accessorFn: (row) => row.total?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'Total value of assets on the chain, excluding own tokens' }
	},
	{
		header: 'Native',
		accessorKey: 'native',
		accessorFn: (row) => row.native?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'Assets minted natively on the chain' }
	},
	{
		header: 'Canonical',
		accessorKey: 'canonical',
		accessorFn: (row) => row.canonical?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'Assets bridged through the official canonical bridge' }
	},
	{
		header: 'Own Tokens',
		accessorKey: 'ownTokens',
		accessorFn: (row) => row.ownTokens?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'The chains own token, either for gas or for governance ' }
	},
	{
		header: 'Third Party',
		accessorKey: 'thirdParty',
		accessorFn: (row) => row.thirdParty?.total ?? undefined,
		cell: (info) => {
			const value = info.getValue()
			if (!value) return <></>
			return <>{formattedNum(value, true)}</>
		},
		meta: { align: 'end', headerHelperText: 'Assets bridged through bridges that aren’t the canonical bridge' }
	}
]
