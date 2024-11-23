import { ColumnDef } from '@tanstack/react-table'
import { CustomLink } from '~/components/Link'
import { useStackBy } from '~/containers/LiquidationsPage/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { CHAINS_API, CONFIG_API } from '~/constants'
import { chainIconUrl } from '~/utils'
import { getReadableValue } from '~/utils/liquidations'
import { ILiquidablePositionsRow, ILiquidableProtocolRow } from './types'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'

export const liquidatableProtocolsColumns: ColumnDef<ILiquidableProtocolRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return <NameCell value={value} index={index} />
		},
		size: 120
	},
	{
		header: '24h Change',
		accessorKey: 'changes24h',
		cell: (info) => {
			const value = info.getValue() as number
			const isNegative = value < 0
			const isZero = value === 0
			const isSmol = Math.abs(value as number) < 0.01

			if (isZero || !value) {
				return <span>-</span>
			}

			if (isSmol) {
				return (
					<span style={{ color: isNegative ? '#F56565' : '#48BB78' }}>
						{'<'}
						{isNegative ? '-' : '+'}
						{'0.01%'}
					</span>
				)
			}

			const _value = (value as number).toFixed(2)
			return (
				<span style={{ color: isNegative ? '#F56565' : '#48BB78' }}>
					{isNegative ? '' : '+'}
					{_value}%
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
		cell: ({ getValue }) => {
			const _value = getReadableValue(getValue() as number)
			return <span>${_value}</span>
		},
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
		cell: ({ getValue }) => {
			const _value = getReadableValue(getValue() as number)
			return <span>${_value}</span>
		},
		meta: {
			align: 'end',
			headerHelperText: 'Amount of liquidable positions that are within -20% of liquidation price.'
		},
		size: 200
	}
]
export const liquidatablePositionsColumns: ColumnDef<ILiquidablePositionsRow>[] = [
	{
		header: 'Protocol',
		accessorKey: 'protocolName',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return <ProtocolName value={value} index={index} />
		},
		size: 120
	},
	{
		header: 'Chain',
		accessorKey: 'chainName',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as string
			return <ChainName value={value} />
		},
		size: 120
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
			// cut middle, leave only first 6 and last 4 letters
			return (
				<a href={value.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 justify-end">
					{value.displayName.length > 13
						? `${value.displayName.substring(0, 6)}...${value.displayName.substring(value.displayName.length - 4)}`
						: value.displayName}
					<Icon name="external-link" height={10} width={10} />
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

const fetchApi = async (url: string) => {
	try {
		const data = await fetch(url).then((res) => res.json())
		return data
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : `Failed to fetch ${url}`)
	}
}
const ProtocolName = ({ value, index }: { value: string; index: number }) => {
	let _value: string

	switch (value) {
		case 'traderjoe':
			_value = 'trader-joe'
			break
		case 'benqi':
			_value = 'benqi-lending'
			break
		case 'maker':
			_value = 'makerdao'
			break
		default:
			_value = value as string
	}

	const { data } = useQuery({
		queryKey: [`${CONFIG_API}/smol/${_value}`],
		queryFn: () => fetchApi(`${CONFIG_API}/smol/${_value}`),
		staleTime: 60 * 60 * 1000
	})

	if (!data) return <span>{_value}</span>

	return (
		<span className="flex items-center gap-2">
			<span className="flex-shrink-0">{index + 1}</span>
			<TokenLogo logo={data.logo} data-lgonly />
			<CustomLink
				href={`/protocol/${_value}`}
				className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline min-w-[200px] ml-4"
			>
				{data.name}
			</CustomLink>
		</span>
	)
}

const ChainName = ({ value, index }: { value: string; index?: number }) => {
	const { data } = useQuery({
		queryKey: [`${CHAINS_API}`],
		queryFn: () => fetchApi(`${CHAINS_API}`),
		staleTime: 60 * 60 * 1000
	})

	if (!data) return <span>{value}</span>

	let _value = value as string
	if (value === 'bsc') {
		_value = 'binance'
	}

	const { name } = data.find((chain) => chain.name.toLowerCase() === _value.toLowerCase()) || {}

	let _name = name
	if (value === 'bsc') {
		_name = 'BSC'
	}

	return (
		<span className="flex items-center gap-2">
			{(index || index === 0) && <span className="flex-shrink-0">{index + 1}</span>}
			<TokenLogo logo={chainIconUrl(name)} data-lgonly />
			<CustomLink
				href={`/chain/${_name}`}
				className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline min-w-[200px] ml-4"
			>
				{_name}
			</CustomLink>
		</span>
	)
}

const NameCell = (props: { value: string; index: number }) => {
	const stackBy = useStackBy()

	if (stackBy === 'protocols') {
		return <ProtocolName {...props} />
	}

	return <ChainName {...props} />
}
