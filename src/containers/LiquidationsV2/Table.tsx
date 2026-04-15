import { createColumnHelper } from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
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
	protocolColumnHelper.accessor('protocol', {
		header: 'Protocol',
		enableSorting: false,
		cell: ({ getValue }) => {
			const protocol = getValue()
			return (
				<BasicLink href={`/liquidations/${protocol}`} className="text-(--link-text) hover:underline">
					{protocol}
				</BasicLink>
			)
		}
	}),
	protocolColumnHelper.accessor('positionCount', {
		header: 'Positions',
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor('chainCount', {
		header: 'Chains',
		meta: { align: 'end' }
	}),
	protocolColumnHelper.accessor('collateralCount', {
		header: 'Collateral IDs',
		meta: { align: 'end' }
	})
]

const overviewChainColumns = [
	overviewChainColumnHelper.accessor('chain', {
		header: 'Chain',
		enableSorting: false
	}),
	overviewChainColumnHelper.accessor('positionCount', {
		header: 'Positions',
		meta: { align: 'end' }
	}),
	overviewChainColumnHelper.accessor('protocolCount', {
		header: 'Protocols',
		meta: { align: 'end' }
	}),
	overviewChainColumnHelper.accessor('collateralCount', {
		header: 'Collateral IDs',
		meta: { align: 'end' }
	})
]

const protocolChainColumns = [
	protocolChainColumnHelper.accessor('chain', {
		header: 'Chain',
		enableSorting: false,
		cell: ({ row, getValue }) => {
			const chain = getValue()
			return (
				<BasicLink
					href={`/liquidations/${row.original.protocol}/${chain}`}
					className="text-(--link-text) hover:underline"
				>
					{chain}
				</BasicLink>
			)
		}
	}),
	protocolChainColumnHelper.accessor('positionCount', {
		header: 'Positions',
		meta: { align: 'end' }
	}),
	protocolChainColumnHelper.accessor('collateralCount', {
		header: 'Collateral IDs',
		meta: { align: 'end' }
	})
]

const positionColumns = [
	positionColumnHelper.accessor('protocol', {
		header: 'Protocol',
		enableSorting: false,
		cell: ({ getValue }) => {
			const protocol = getValue()
			return (
				<BasicLink href={`/liquidations/${protocol}`} className="text-(--link-text) hover:underline">
					{protocol}
				</BasicLink>
			)
		}
	}),
	positionColumnHelper.accessor('chain', {
		header: 'Chain',
		enableSorting: false,
		cell: ({ row, getValue }) => {
			const chain = getValue()
			return (
				<BasicLink
					href={`/liquidations/${row.original.protocol}/${chain}`}
					className="text-(--link-text) hover:underline"
				>
					{chain}
				</BasicLink>
			)
		}
	}),
	positionColumnHelper.accessor('ownerName', {
		header: 'Owner',
		enableSorting: false,
		cell: ({ row, getValue }) => (
			<a
				href={row.original.ownerUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-1 hover:underline"
			>
				<span>{shorten(getValue())}</span>
				<Icon name="external-link" height={12} width={12} />
			</a>
		)
	}),
	positionColumnHelper.accessor('liqPrice', {
		header: 'Liquidation Price',
		cell: ({ getValue }) => formattedNum(getValue(), true),
		meta: { align: 'end' }
	}),
	positionColumnHelper.accessor('collateral', {
		header: 'Collateral ID',
		enableSorting: false
	}),
	positionColumnHelper.accessor('collateralAmount', {
		header: 'Raw Amount',
		enableSorting: false,
		cell: ({ getValue }) => shorten(getValue()),
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
			columnToSearch="protocol"
			placeholder="Search protocols..."
			csvFileName="liquidations-v2-protocols"
			embedded={embedded}
			sortingState={[{ id: 'positionCount', desc: true }]}
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
			columnToSearch="chain"
			placeholder="Search chains..."
			csvFileName="liquidations-v2-chains"
			embedded={embedded}
			sortingState={[{ id: 'positionCount', desc: true }]}
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
			columnToSearch="chain"
			placeholder="Search chains..."
			csvFileName="liquidations-v2-protocol-chains"
			embedded={embedded}
			sortingState={[{ id: 'positionCount', desc: true }]}
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
			sortingState={[{ id: 'liqPrice', desc: false }]}
		/>
	)
}
