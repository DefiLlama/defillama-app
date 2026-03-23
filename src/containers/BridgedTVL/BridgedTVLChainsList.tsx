import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, slug } from '~/utils'
import type { RawChainsAssetsResponse, RawChainAssetsFlowEntry } from './api.types'
import type { IBridgedRow } from './types'

interface BridgedTVLChainsListProps {
	assets: RawChainsAssetsResponse
	chains: Array<{ label: string; to: string }>
	flows1d: Record<string, RawChainAssetsFlowEntry> | null
}

const DEFAULT_SORTING_STATE = [{ id: 'total', desc: true }]

const columnHelper = createColumnHelper<IBridgedRow>()

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
				csvFileName="bridged-chains"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

const bridgedColumns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo name={value} kind="chain" alt={`Logo of ${value}`} />
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
	}),
	columnHelper.accessor((row) => row.total?.total ?? undefined, {
		id: 'total',
		header: 'Total Bridged',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: 'Total value of assets on the chain, excluding own tokens' }
	}),
	columnHelper.accessor((row) => row.native?.total ?? undefined, {
		id: 'native',
		header: 'Native',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: 'Assets minted natively on the chain' }
	}),
	columnHelper.accessor((row) => row.canonical?.total ?? undefined, {
		id: 'canonical',
		header: 'Canonical',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: 'Assets bridged through the official canonical bridge' }
	}),
	columnHelper.accessor((row) => row.ownTokens?.total ?? undefined, {
		id: 'ownTokens',
		header: 'Own Tokens',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: 'The chains own token, either for gas or for governance ' }
	}),
	columnHelper.accessor((row) => row.thirdParty?.total ?? undefined, {
		id: 'thirdParty',
		header: 'Third Party',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: { align: 'end', headerHelperText: 'Assets bridged through bridges that aren’t the canonical bridge' }
	})
]
