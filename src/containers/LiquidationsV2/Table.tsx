import { createColumnHelper } from '@tanstack/react-table'
import { matchSorter } from 'match-sorter'
import * as React from 'react'
import type { BlockExplorersResponse } from '~/api/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum } from '~/utils'
import type { LiquidationPosition, OverviewChainRow, OverviewProtocolRow, ProtocolChainRow } from './api.types'
import { LiquidationsExplorerProvider, LiquidationsOwnerLink } from './OwnerLink'

interface LiquidationsTableProps {
	embedded?: boolean
	leadingControls?: React.ReactNode | null
}

const protocolColumnHelper = createColumnHelper<OverviewProtocolRow>()
const overviewChainColumnHelper = createColumnHelper<OverviewChainRow>()
const protocolChainColumnHelper = createColumnHelper<ProtocolChainRow>()
const positionColumnHelper = createColumnHelper<LiquidationPosition>()

export function filterLiquidationPositions(rows: LiquidationPosition[], searchValue: string): LiquidationPosition[] {
	const searchTerm = searchValue.trim()
	if (!searchTerm) return rows

	return matchSorter(rows, searchTerm, {
		keys: ['protocolName', 'protocolSlug', 'chainName', 'chainSlug', 'ownerName', 'owner', 'collateral'],
		threshold: matchSorter.rankings.CONTAINS
	})
}

const protocolColumns = [
	protocolColumnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		enableSorting: false,
		cell: ({ row, getValue }) => {
			const protocol = getValue()
			return (
				<span className="flex items-center gap-2">
					<TokenLogo name={protocol} kind="token" data-lgonly alt={`Logo of ${protocol}`} />
					<BasicLink href={`/liquidations/${row.original.slug}`} className="text-(--link-text) hover:underline">
						{protocol}
					</BasicLink>
				</span>
			)
		},
		size: 220
	}),
	protocolColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		size: 110,
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor((row) => row.chainCount ?? undefined, {
		id: 'chainCount',
		header: 'Chains',
		size: 90,
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor((row) => row.collateralCount ?? undefined, {
		id: 'collateralCount',
		header: 'Tokens',
		size: 80,
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		size: 145,
		meta: { align: 'end' }
	})
]

const overviewChainColumns = [
	overviewChainColumnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		cell: ({ getValue }) => {
			const chain = getValue()
			return (
				<span className="flex items-center gap-2">
					<TokenLogo name={chain} kind="chain" data-lgonly alt={`Logo of ${chain}`} />
					<span>{chain}</span>
				</span>
			)
		},
		enableSorting: false,
		size: 180
	}),
	overviewChainColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		size: 110,
		meta: { align: 'end' }
	}),
	overviewChainColumnHelper.accessor((row) => row.protocolCount ?? undefined, {
		id: 'protocolCount',
		header: 'Protocols',
		size: 110,
		meta: { align: 'end' }
	}),
	overviewChainColumnHelper.accessor((row) => row.collateralCount ?? undefined, {
		id: 'collateralCount',
		header: 'Tokens',
		size: 80,
		meta: { align: 'end' }
	}),
	overviewChainColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		size: 145,
		meta: { align: 'end' }
	})
]

const protocolChainColumns = [
	protocolChainColumnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		enableSorting: false,
		cell: ({ row, getValue }) => {
			const chain = getValue()
			return (
				<span className="flex items-center gap-2">
					<TokenLogo name={chain} kind="chain" data-lgonly alt={`Logo of ${chain}`} />
					<BasicLink
						href={`/liquidations/${row.original.protocolSlug}/${row.original.slug}`}
						className="text-(--link-text) hover:underline"
					>
						{chain}
					</BasicLink>
				</span>
			)
		},
		size: 180
	}),
	protocolChainColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		size: 110,
		meta: { align: 'end' }
	}),
	protocolChainColumnHelper.accessor((row) => row.collateralCount ?? undefined, {
		id: 'collateralCount',
		header: 'Tokens',
		size: 80,
		meta: { align: 'end' }
	}),
	protocolChainColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		size: 145,
		meta: { align: 'end' }
	})
]

const positionColumns = [
	positionColumnHelper.accessor('protocolName', {
		id: 'protocolName',
		header: 'Protocol',
		enableSorting: false,
		cell: ({ row, getValue }) => {
			const protocol = getValue()
			return (
				<span className="flex items-center gap-2">
					<TokenLogo name={protocol} kind="token" data-lgonly alt={`Logo of ${protocol}`} />
					<BasicLink href={`/liquidations/${row.original.protocolSlug}`} className="text-(--link-text) hover:underline">
						{protocol}
					</BasicLink>
				</span>
			)
		},
		size: 220
	}),
	positionColumnHelper.accessor('chainName', {
		id: 'chainName',
		header: 'Chain',
		enableSorting: false,
		cell: ({ row, getValue }) => {
			const chain = getValue()
			return (
				<span className="flex items-center gap-2">
					<TokenLogo name={chain} kind="chain" data-lgonly alt={`Logo of ${chain}`} />
					<BasicLink
						href={`/liquidations/${row.original.protocolSlug}/${row.original.chainSlug}`}
						className="text-(--link-text) hover:underline"
					>
						{chain}
					</BasicLink>
				</span>
			)
		},
		size: 140
	}),
	positionColumnHelper.accessor('ownerName', {
		id: 'ownerName',
		header: 'Owner',
		enableSorting: false,
		cell: ({ row }) => <LiquidationsOwnerLink position={row.original} />,
		size: 220
	}),
	positionColumnHelper.accessor((row) => row.collateral ?? undefined, {
		id: 'collateral',
		header: 'Token',
		enableSorting: false,
		size: 80,
		meta: { align: 'end' }
	}),
	positionColumnHelper.accessor((row) => row.collateralAmountUsd ?? undefined, {
		id: 'collateralAmountUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		size: 145,
		meta: { align: 'end' }
	}),
	positionColumnHelper.accessor((row) => row.collateralAmount ?? undefined, {
		id: 'collateralAmount',
		header: 'Raw Amount',
		cell: ({ getValue }) => formattedNum(getValue()),
		size: 140,
		meta: { align: 'end' }
	}),
	positionColumnHelper.accessor((row) => row.liqPrice ?? undefined, {
		id: 'liqPrice',
		header: 'Liquidation Price',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		size: 160,
		meta: { align: 'end' }
	})
]

export function LiquidationsProtocolsTable({
	rows,
	embedded = false,
	leadingControls = null
}: { rows: OverviewProtocolRow[] } & LiquidationsTableProps) {
	return (
		<TableWithSearch
			data={rows}
			columns={protocolColumns}
			header={embedded ? null : 'Protocols'}
			leadingControls={leadingControls}
			columnToSearch="name"
			placeholder="Search protocols..."
			csvFileName="liquidations-v2-protocols"
			embedded={embedded}
			sortingState={[{ id: 'totalCollateralUsd', desc: true }]}
		/>
	)
}

export function LiquidationsOverviewChainsTable({
	rows,
	embedded = false,
	leadingControls = null
}: { rows: OverviewChainRow[] } & LiquidationsTableProps) {
	return (
		<TableWithSearch
			data={rows}
			columns={overviewChainColumns}
			header={embedded ? null : 'Chains'}
			leadingControls={leadingControls}
			columnToSearch="name"
			placeholder="Search chains..."
			csvFileName="liquidations-v2-chains"
			embedded={embedded}
			sortingState={[{ id: 'totalCollateralUsd', desc: true }]}
		/>
	)
}

export function LiquidationsProtocolChainsTable({
	rows,
	embedded = false,
	leadingControls = null
}: { rows: ProtocolChainRow[] } & LiquidationsTableProps) {
	return (
		<TableWithSearch
			data={rows}
			columns={protocolChainColumns}
			header={embedded ? null : 'Chains'}
			leadingControls={leadingControls}
			columnToSearch="name"
			placeholder="Search chains..."
			csvFileName="liquidations-v2-protocol-chains"
			embedded={embedded}
			sortingState={[{ id: 'totalCollateralUsd', desc: true }]}
		/>
	)
}

export function LiquidationsPositionsTable({
	rows,
	ownerBlockExplorers,
	header,
	embedded = false,
	leadingControls = null
}: {
	rows: LiquidationPosition[]
	ownerBlockExplorers: BlockExplorersResponse
	header: string
} & LiquidationsTableProps) {
	const [searchValue, setSearchValue] = React.useState('')
	const deferredSearchValue = React.useDeferredValue(searchValue)
	const filteredRows = React.useMemo(
		() => filterLiquidationPositions(rows, deferredSearchValue),
		[rows, deferredSearchValue]
	)

	return (
		<LiquidationsExplorerProvider blockExplorers={ownerBlockExplorers}>
			<TableWithSearch
				data={filteredRows}
				columns={positionColumns}
				header={embedded ? null : header}
				leadingControls={leadingControls}
				customFilters={
					<label className="relative w-full max-w-full sm:max-w-[280px]">
						<span className="sr-only">Search positions</span>
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
						/>
						<input
							onInput={(e) => setSearchValue(e.currentTarget.value)}
							placeholder="Search positions by protocol, chain, owner, or collateral"
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
				}
				csvFileName="liquidations-v2-positions"
				embedded={embedded}
				sortingState={[{ id: 'collateralAmountUsd', desc: true }]}
			/>
		</LiquidationsExplorerProvider>
	)
}
