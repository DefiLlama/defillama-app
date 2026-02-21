import { useQuery } from '@tanstack/react-query'
import {
	type ColumnDef,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import { CONFIG_API } from '~/constants'
import { fetchChainsList } from '~/containers/Chains/api'
import type { ChainListItem } from '~/containers/Chains/api.types'
import type { ChartData } from '~/containers/Liquidations/utils'
import { chainIconUrl, formattedNum } from '~/utils'
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

const fetchApi = async (url: string) => {
	try {
		const data: unknown = await fetchJson(url)
		return data
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : `Failed to fetch ${url}`)
	}
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
			const res = await fetchApi(`${CONFIG_API}/smol/${_value}`)
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
			<TokenLogo logo={data.logo} data-lgonly />
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
		queryKey: ['chains'],
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
			<TokenLogo logo={chainIconUrl(name)} data-lgonly />
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

const liquidatableProtocolsColumns: ColumnDef<ILiquidableProtocolRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as string

			return <NameCell value={value} />
		},
		size: 160
	},
	{
		header: '24h Change',
		accessorKey: 'changes24h',
		cell: (info) => {
			const value = info.getValue() as number | null

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
	},
	{
		header: 'Liquidatable Amount',
		accessorKey: 'liquidableAmount',
		enableSorting: true,
		cell: ({ getValue }) => formattedNum(getValue(), true),
		meta: {
			align: 'end',
			headerHelperText: 'The USD value of all the collateral that would be sold if all positions went into liquidation.'
		},
		size: 200
	},
	{
		header: 'Amount within -20%',
		accessorKey: 'dangerousAmount',
		enableSorting: true,
		cell: ({ getValue }) => formattedNum(getValue(), true),
		meta: {
			align: 'end',
			headerHelperText: 'Amount of liquidable positions that are within -20% of liquidation price.'
		},
		size: 200
	}
]

const liquidatablePositionsColumns: ColumnDef<ILiquidablePositionsRow>[] = [
	{
		header: 'Protocol',
		accessorKey: 'protocolName',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as string
			return <ProtocolName value={value} />
		},
		size: 160
	},
	{
		header: 'Chain',
		accessorKey: 'chainName',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as string
			return <ChainName value={value} />
		},
		size: 140
	},
	{
		header: 'Owner',
		accessorKey: 'owner',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as ILiquidablePositionsRow['owner']

			if (typeof value !== 'object') {
				return <span>{value}</span>
			}
			return (
				<a
					href={value.url}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center justify-end gap-2 hover:underline"
				>
					{value.displayName.length > 13
						? `${value.displayName.substring(0, 6)}...${value.displayName.substring(value.displayName.length - 4)}`
						: value.displayName}
					<Icon name="external-link" height={12} width={12} />
				</a>
			)
		},
		meta: { align: 'end' }
	},
	{
		header: 'Value in USD',
		accessorKey: 'value',
		cell: ({ getValue }) => {
			const _value = (getValue() as number).toLocaleString()
			return <span>${_value}</span>
		},
		meta: { align: 'end' }
	},
	{
		header: 'Token Amount',
		accessorKey: 'amount',
		cell: ({ getValue }) => {
			const _value = (getValue() as number).toLocaleString()
			return <span>{_value}</span>
		},
		meta: { align: 'end' }
	},
	{
		header: 'Liquidation Price',
		accessorKey: 'liqPrice',
		cell: ({ getValue }) => {
			const _value = (getValue() as number).toLocaleString()
			return (
				<span>
					<b>${_value}</b>
				</span>
			)
		},
		meta: {
			headerHelperText: 'Liquidation price in USD.',
			align: 'end'
		}
	}
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
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	return <VirtualTable instance={instance} />
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
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	return <VirtualTable instance={instance} />
}
