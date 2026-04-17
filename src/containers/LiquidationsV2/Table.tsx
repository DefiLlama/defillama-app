import { createColumnHelper } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum } from '~/utils'
import type { LiquidationPosition, OverviewChainRow, OverviewProtocolRow, ProtocolChainRow } from './api.types'

interface LiquidationsTableProps {
	embedded?: boolean
	leadingControls?: React.ReactNode | null
}

const protocolColumnHelper = createColumnHelper<OverviewProtocolRow>()
const overviewChainColumnHelper = createColumnHelper<OverviewChainRow>()
const protocolChainColumnHelper = createColumnHelper<ProtocolChainRow>()
const positionColumnHelper = createColumnHelper<LiquidationPosition>()

function shorten(value: string): string {
	if (value.length <= 18) return value
	return `${value.slice(0, 8)}...${value.slice(-6)}`
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
		}
	}),
	protocolColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor((row) => row.chainCount ?? undefined, {
		id: 'chainCount',
		header: 'Chains',
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor((row) => row.collateralCount ?? undefined, {
		id: 'collateralCount',
		header: 'Tokens',
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
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
		enableSorting: false
	}),
	overviewChainColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		meta: { align: 'end' }
	}),
	overviewChainColumnHelper.accessor((row) => row.protocolCount ?? undefined, {
		id: 'protocolCount',
		header: 'Protocols',
		meta: { align: 'end' }
	}),
	overviewChainColumnHelper.accessor((row) => row.collateralCount ?? undefined, {
		id: 'collateralCount',
		header: 'Tokens',
		meta: { align: 'end' }
	}),
	overviewChainColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
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
		}
	}),
	protocolChainColumnHelper.accessor((row) => row.positionCount ?? undefined, {
		id: 'positionCount',
		header: 'Positions',
		meta: { align: 'end' }
	}),
	protocolChainColumnHelper.accessor((row) => row.collateralCount ?? undefined, {
		id: 'collateralCount',
		header: 'Tokens',
		meta: { align: 'end' }
	}),
	protocolChainColumnHelper.accessor((row) => row.totalCollateralUsd ?? undefined, {
		id: 'totalCollateralUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
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
		}
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
		}
	}),
	positionColumnHelper.accessor('ownerName', {
		id: 'ownerName',
		header: 'Owner',
		enableSorting: false,
		cell: ({ row, getValue }) =>
			row.original.ownerUrl ? (
				<a
					href={row.original.ownerUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-1 hover:underline"
				>
					<span>{shorten(getValue())}</span>
					<Icon name="external-link" height={12} width={12} />
				</a>
			) : (
				<span>{shorten(getValue())}</span>
			)
	}),
	positionColumnHelper.accessor((row) => row.collateral ?? undefined, {
		id: 'collateral',
		header: 'Collateral ID',
		enableSorting: false,
		meta: { align: 'end' }
	}),
	positionColumnHelper.accessor((row) => row.collateralAmountUsd ?? undefined, {
		id: 'collateralAmountUsd',
		header: 'Collateral USD',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		meta: { align: 'end' }
	}),
	positionColumnHelper.accessor((row) => row.collateralAmount ?? undefined, {
		id: 'collateralAmount',
		header: 'Raw Amount',
		cell: ({ getValue }) => formattedNum(getValue()),
		meta: { align: 'end' }
	}),
	positionColumnHelper.accessor((row) => row.liqPrice ?? undefined, {
		id: 'liqPrice',
		header: 'Liquidation Price',
		cell: ({ getValue }) => formattedNum(getValue(), true),
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
	header,
	embedded = false,
	leadingControls = null
}: { rows: LiquidationPosition[]; header: string } & LiquidationsTableProps) {
	return (
		<TableWithSearch
			data={rows}
			columns={positionColumns}
			header={embedded ? null : header}
			leadingControls={leadingControls}
			columnToSearch="ownerName"
			placeholder="Search owners..."
			csvFileName="liquidations-v2-positions"
			embedded={embedded}
			sortingState={[{ id: 'collateralAmountUsd', desc: true }]}
		/>
	)
}
