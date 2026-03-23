import { useQuery } from '@tanstack/react-query'
import {
	createColumnHelper,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { CONFIG_API } from '~/constants'
import { fetchChainsList } from '~/containers/Chains/api'
import type { ChainListItem } from '~/containers/Chains/api.types'
import type { ChartData } from '~/containers/Liquidations/utils'
import { formattedNum } from '~/utils'
import { fetchJson } from '~/utils/async'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

interface ILiquidableProtocolRow {
	name: string
	changes24h: number | null
	liquidableAmount: number
	dangerousAmount: number
}

interface ILiquidablePositionsRow {
	protocolName: string
	chainName: string
	owner?: {
		url: string
		displayName: string
	}
	value: number
	amount: number
	liqPrice: number
}

export const LiqProtocolsTable = (props: { data: ChartData; prevData: ChartData }) => {
	const { stackBy: stackByQuery } = useRouter().query as { stackBy?: 'chains' | 'protocols' }
	const stackBy = stackByQuery ?? 'protocols'

	const data = React.useMemo(() => {
		const result: ILiquidableProtocolRow[] = []
		for (const name in props.data.totalLiquidables[stackBy]) {
			const current = props.data.totalLiquidables[stackBy][name]
			const prev = props.prevData.totalLiquidables[stackBy][name]
			const changes24h = prev == null || prev === 0 ? null : ((current - prev) / prev) * 100
			const liquidableAmount = current
			const dangerousAmount = props.data.dangerousPositionsAmounts[stackBy][name]
			result.push({
				name,
				changes24h,
				liquidableAmount,
				dangerousAmount
			})
		}
		return result
	}, [props.data.totalLiquidables, props.prevData.totalLiquidables, props.data.dangerousPositionsAmounts, stackBy])

	return <LiquidatableProtocolsTable data={data} />
}

export const LiqPositionsTable = (props: { data: ChartData; prevData: ChartData }) => {
	const rows = React.useMemo<ILiquidablePositionsRow[]>(() => {
		return props.data.topPositions.map(
			(p): ILiquidablePositionsRow => ({
				chainName: p.chain,
				protocolName: p.protocol,
				value: p.collateralValue,
				amount: p.collateralAmount,
				liqPrice: p.liqPrice,
				owner:
					typeof p.displayName === 'string' && p.displayName.length > 0
						? {
								displayName: p.displayName,
								url: p.url
							}
						: undefined
			})
		)
	}, [props.data])

	return <LiquidatablePositionsTable data={rows} />
}

type ProtocolConfig = { logo: string; name: string }
const isProtocolConfig = (value: unknown): value is ProtocolConfig =>
	isRecord(value) && typeof value.logo === 'string' && typeof value.name === 'string'

const isChainList = (value: unknown): value is ChainListItem[] =>
	Array.isArray(value) && value.every((x) => isRecord(x) && typeof x.name === 'string')

const ProtocolName = ({ value }: { value: string }) => {
	let _value: string

	switch (value) {
		case 'traderjoe':
			_value = 'trader-joe'
			break
		case 'benqi':
			_value = 'benqi-lending'
			break
		case 'maker':
			_value = 'sky'
			break
		case 'mimo-protocol':
			_value = 'mimo'
			break
		case 'compound':
			_value = 'compound-finance'
			break
		case 'solend':
			_value = 'save-protocol'
			break
		case 'trader-joe-lend':
			_value = 'joe-lend'
			break
		case 'navi':
			_value = 'navi-lending'
			break
		default:
			_value = value
	}

	const { data } = useQuery<ProtocolConfig | null>({
		queryKey: [`${CONFIG_API}/smol/${_value}`],
		queryFn: async () => {
			const res = await fetchJson<unknown>(`${CONFIG_API}/smol/${_value}`)
			return isProtocolConfig(res) ? res : null
		},
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	if (!data) return <span>{_value}</span>

	return (
		<span className="flex min-w-0 items-center gap-2">
			<span className="vf-row-index shrink-0" aria-hidden="true" />
			<TokenLogo src={data.logo} data-lgonly alt={`Logo of ${data.name}`} />
			<BasicLink
				href={`/protocol/${_value}`}
				className="min-w-0 flex-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
			>
				{data.name}
			</BasicLink>
		</span>
	)
}

const ChainName = ({ value }: { value: string }) => {
	const { data } = useQuery<ChainListItem[] | null>({
		queryKey: ['liquidations', 'chains'],
		queryFn: async () => {
			const res = await fetchChainsList()
			return isChainList(res) ? res : null
		},
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	if (!data) return <span>{value}</span>

	let _value = value
	if (value === 'bsc') {
		_value = 'binance'
	}

	const match = data.find((chain) => chain.name.toLowerCase() === _value.toLowerCase())
	const name = match?.name
	if (!name) return <span>{value}</span>

	const displayName = value === 'bsc' ? 'BSC' : name

	return (
		<span className="flex min-w-0 items-center gap-2">
			<TokenLogo name={name} kind="chain" data-lgonly alt={`Logo of ${name}`} />
			<BasicLink
				href={`/chain/${displayName}`}
				className="min-w-0 flex-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
			>
				{displayName}
			</BasicLink>
		</span>
	)
}

const NameCell = (props: { value: string }) => {
	const { stackBy: stackByQuery } = useRouter().query as { stackBy?: 'chains' | 'protocols' }
	const stackBy = stackByQuery ?? 'protocols'

	if (stackBy === 'protocols') {
		return <ProtocolName {...props} />
	}

	return <ChainName {...props} />
}

const protocolsColumnHelper = createColumnHelper<ILiquidableProtocolRow>()
const positionsColumnHelper = createColumnHelper<ILiquidablePositionsRow>()

const liquidatableProtocolsColumns = [
	protocolsColumnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue()

			return <NameCell value={value} />
		},
		size: 160
	}),
	protocolsColumnHelper.accessor('changes24h', {
		header: '24h Change',
		cell: (info) => {
			const value = info.getValue()

			if (value == null || value === 0) {
				return <span>-</span>
			}

			const isNegative = value < 0
			const isSmol = Math.abs(value) < 0.01

			if (isSmol) {
				return (
					<span className={`${isNegative ? 'text-(--error)' : 'text-(--success)'}`}>
						{'<'}
						{isNegative ? '-' : '+'}
						{'0.01%'}
					</span>
				)
			}

			return (
				<span className={`${isNegative ? 'text-(--error)' : 'text-(--success)'}`}>
					{isNegative ? '' : '+'}
					{value.toFixed(2)}%
				</span>
			)
		},
		meta: {
			align: 'end',
			headerHelperText: 'Liquidatable amount change in the last 24 hours.'
		}
	}),
	protocolsColumnHelper.accessor('liquidableAmount', {
		header: 'Liquidatable Amount',
		enableSorting: true,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			align: 'end',
			headerHelperText: 'The USD value of all the collateral that would be sold if all positions went into liquidation.'
		},
		size: 200
	}),
	protocolsColumnHelper.accessor('dangerousAmount', {
		header: 'Amount within -20%',
		enableSorting: true,
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			align: 'end',
			headerHelperText: 'Amount of liquidable positions that are within -20% of liquidation price.'
		},
		size: 200
	})
]

const liquidatablePositionsColumns = [
	positionsColumnHelper.accessor('protocolName', {
		header: 'Protocol',
		enableSorting: false,
		cell: ({ getValue }) => <ProtocolName value={getValue()} />,
		size: 160
	}),
	positionsColumnHelper.accessor('chainName', {
		header: 'Chain',
		enableSorting: false,
		cell: ({ getValue }) => <ChainName value={getValue()} />,
		size: 140
	}),
	positionsColumnHelper.accessor((row) => row.owner?.displayName ?? '', {
		id: 'owner',
		header: 'Owner',
		enableSorting: false,
		cell: ({ row }) => {
			const owner = row.original.owner

			if (typeof owner !== 'object' || owner == null) {
				return <span />
			}
			return (
				<a
					href={owner.url}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center justify-end gap-2 hover:underline"
				>
					{owner.displayName.length > 13
						? `${owner.displayName.substring(0, 6)}...${owner.displayName.substring(owner.displayName.length - 4)}`
						: owner.displayName}
					<Icon name="external-link" height={12} width={12} />
				</a>
			)
		},
		meta: { align: 'end' }
	}),
	positionsColumnHelper.accessor('value', {
		header: 'Value in USD',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: { align: 'end' }
	}),
	positionsColumnHelper.accessor('amount', {
		header: 'Token Amount',
		cell: (info) => formattedNum(info.getValue()),
		meta: { align: 'end' }
	}),
	positionsColumnHelper.accessor('liqPrice', {
		header: 'Liquidation Price',
		cell: (info) => <b>{formattedNum(info.getValue(), true)}</b>,
		meta: {
			headerHelperText: 'Liquidation price in USD.',
			align: 'end'
		}
	})
]

function LiquidatableProtocolsTable({ data }: { data: ILiquidableProtocolRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'liquidableAmount' }])

	const instance = useReactTable({
		data,
		columns: liquidatableProtocolsColumns,
		state: {
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	return (
		<div>
			<div className="flex justify-end p-3">
				<CSVDownloadButton prepareCsv={() => prepareTableCsv({ instance, filename: 'liquidatable-protocols' })} smol />
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

function LiquidatablePositionsTable({ data }: { data: ILiquidablePositionsRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'value' }])

	const instance = useReactTable({
		data,
		columns: liquidatablePositionsColumns,
		state: {
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	return (
		<div>
			<div className="flex justify-end p-3">
				<CSVDownloadButton prepareCsv={() => prepareTableCsv({ instance, filename: 'liquidatable-positions' })} smol />
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
