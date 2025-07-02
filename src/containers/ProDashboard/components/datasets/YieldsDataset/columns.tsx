import { ColumnDef } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, formattedPercent, tokenIconUrl } from '~/utils'
import { IconsRow } from '~/components/IconsRow'

interface IYieldsRow {
	pool: string
	configID: string
	projectslug: string
	project: string
	airdrop: boolean
	chains: string[]
	tvl: number
	apy: number
	apyBase: number
	apyReward: number
	rewardTokensSymbols: string[]
	change1d: number
	change7d: number
	il7d: number
	apyBase7d: number
	apyNet7d: number
	apyMean30d: number
	volumeUsd1d: number
	volumeUsd7d: number
	apyBaseBorrow: number | null
	apyRewardBorrow: number | null
	apyBorrow: number | null
	totalSupplyUsd: number | null
	totalBorrowUsd: number | null
	totalAvailableUsd: number | null
	ltv: number | null
	poolMeta: string | null
}

export const yieldsDatasetColumns: ColumnDef<IYieldsRow>[] = [
	{
		header: 'Pool',
		id: 'pool',
		accessorFn: (row) => row.pool,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const index = row.index
			const pool = getValue() as string
			return (
				<span className="flex items-center gap-2 relative pl-6">
					<TokenLogo size={20} logo={tokenIconUrl(row.original.project)} data-lgonly />
					<BasicLink
						href={`/yields/pool/${row.original.configID}`}
						className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis"
					>
						{pool}
					</BasicLink>
					{row.original.poolMeta && <span className="text-xs text-(--text2)">{row.original.poolMeta}</span>}
				</span>
			)
		},
		size: 120
	},
	{
		header: 'Project',
		accessorKey: 'project',
		cell: ({ getValue, row }) => {
			const value = getValue() as string
			return (
				<BasicLink href={`/yields?project=${row.original.projectslug}`} className="text-sm text-(--link-text)">
					{value}
				</BasicLink>
			)
		},
		size: 140
	},
	{
		header: 'Chain',
		accessorKey: 'chains',
		enableSorting: false,
		cell: (info) => <IconsRow links={info.getValue() as Array<string>} url="/yields?chain" iconType="chain" />,
		size: 60,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{formattedNum(value, true)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'APY',
		accessorKey: 'apy',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{formattedPercent(value, true, 700)}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Base APY',
		accessorKey: 'apyBase',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value ? formattedPercent(value, true) : '-'}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Reward APY',
		accessorKey: 'apyReward',
		cell: ({ getValue, row }) => {
			const value = getValue() as number
			const symbols = row.original.rewardTokensSymbols
			return (
				<span className="flex items-center justify-end gap-1">
					{value ? formattedPercent(value, true) : '-'}
					{symbols && symbols.length > 0 && <span className="text-xs text-(--text2)">({symbols.join(', ')})</span>}
				</span>
			)
		},
		size: 150,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Change',
		accessorKey: 'change1d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value ? formattedPercent(value) : '-'}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change7d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value ? formattedPercent(value) : '-'}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d IL',
		accessorKey: 'il7d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value ? formattedPercent(value, true) : '-'}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Base APY (7d)',
		accessorKey: 'apyBase7d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value ? formattedPercent(value, true) : '-'}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Net APY (7d)',
		accessorKey: 'apyNet7d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value ? formattedPercent(value, true) : '-'}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Mean APY (30d)',
		accessorKey: 'apyMean30d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value ? formattedPercent(value, true) : '-'}</>
		},
		size: 130,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Volume (24h)',
		accessorKey: 'volumeUsd1d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value ? formattedNum(value, true) : '-'}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Volume (7d)',
		accessorKey: 'volumeUsd7d',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{value ? formattedNum(value, true) : '-'}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Borrow APY',
		accessorKey: 'apyBorrow',
		sortDescFirst: true,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return <>{value !== null ? formattedPercent(value, true) : '-'}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Supplied',
		accessorKey: 'totalSupplyUsd',
		sortDescFirst: true,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return <>{value !== null ? formattedNum(value, true) : '-'}</>
		},
		size: 130,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Borrowed',
		accessorKey: 'totalBorrowUsd',
		sortDescFirst: true,
		invertSorting: true,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return <>{value !== null ? formattedNum(value, true) : '-'}</>
		},
		size: 130,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Available',
		accessorKey: 'totalAvailableUsd',
		sortDescFirst: true,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return <>{value !== null ? formattedNum(value, true) : '-'}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'LTV',
		accessorKey: 'ltv',
		sortDescFirst: true,
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			return <>{value !== null ? formattedPercent(value * 100, true) : '-'}</>
		},
		size: 80,
		meta: {
			align: 'end'
		}
	}
]
