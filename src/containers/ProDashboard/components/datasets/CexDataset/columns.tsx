import { ColumnDef } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, formattedPercent } from '~/utils'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

interface ICexRow {
	name: string
	slug?: string
	coin?: string
	coinSymbol?: string
	tvl?: number
	cleanTvl?: number
	'24hInflows'?: number | null
	'7dInflows'?: number | null
	'1mInflows'?: number | null
	spotVolume?: number
	oi?: number
	leverage?: number
	lastAuditDate?: number
	auditor?: string | null
	walletsLink?: string
	auditLink?: string
}

export const cexDatasetColumns: ColumnDef<ICexRow>[] = [
	{
		header: 'Name',
		id: 'name',
		accessorFn: (row) => row.name,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			// Use row.index which is already calculated by tanstack table
			const index = row.index
			const name = getValue() as string
			const coinSymbol = row.original.coinSymbol

			return (
				<span className="flex items-center gap-2 relative pl-6">
					<span className="flex-shrink-0">{index + 1}</span>

					<BasicLink
						href={`/cex/${row.original.slug || name}`}
						className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis"
					>
						{name}
						{coinSymbol && coinSymbol !== '-' && <span className="text-[var(--text3)]"> ({coinSymbol})</span>}
					</BasicLink>
					{row.original.walletsLink && (
						<a href={row.original.walletsLink} target="_blank" rel="noopener noreferrer" className="ml-1">
							<Icon name="external-link" height={14} width={14} />
						</a>
					)}
				</span>
			)
		},
		size: 280
	},
	{
		header: 'Total Assets',
		accessorKey: 'cleanTvl',
		cell: ({ getValue }) => {
			const value = getValue() as number
			return <>{formattedNum(value, true)}</>
		},
		size: 145,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Inflows',
		accessorKey: '24hInflows',
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			if (value === null) return <span className="text-[var(--text3)]">-</span>
			return (
				<span className={`font-mono ${value < 0 ? 'text-[var(--pct-red)]' : 'text-[var(--pct-green)]'}`}>
					{value > 0 ? '+' : ''}
					{formattedNum(value, true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Inflows',
		accessorKey: '7dInflows',
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			if (value === null) return <span className="text-[var(--text3)]">-</span>
			return (
				<span className={`font-mono ${value < 0 ? 'text-[var(--pct-red)]' : 'text-[var(--pct-green)]'}`}>
					{value > 0 ? '+' : ''}
					{formattedNum(value, true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Inflows',
		accessorKey: '1mInflows',
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			if (value === null) return <span className="text-[var(--text3)]">-</span>
			return (
				<span className={`font-mono ${value < 0 ? 'text-[var(--pct-red)]' : 'text-[var(--pct-green)]'}`}>
					{value > 0 ? '+' : ''}
					{formattedNum(value, true)}
				</span>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Spot Volume',
		accessorKey: 'spotVolume',
		cell: ({ getValue }) => {
			const value = getValue() as number | undefined
			if (!value) return <span className="text-[var(--text3)]">-</span>
			return <>{formattedNum(value, true)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Open Interest',
		accessorKey: 'oi',
		cell: ({ getValue }) => {
			const value = getValue() as number | undefined
			if (!value) return <span className="text-[var(--text3)]">-</span>
			return <>{formattedNum(value, true)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Leverage',
		accessorKey: 'leverage',
		cell: ({ getValue }) => {
			const value = getValue() as number | undefined
			if (!value) return <span className="text-[var(--text3)]">-</span>
			return <span className="font-mono">{value.toFixed(2)}x</span>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Audit',
		id: 'audit',
		accessorFn: (row) => row.auditor,
		cell: ({ row }) => {
			const { auditor, lastAuditDate, auditLink } = row.original as ICexRow
			if (!auditor && !lastAuditDate) return <span className="text-[var(--text3)]">-</span>

			const auditDateStr = lastAuditDate ? new Date(lastAuditDate * 1000).toLocaleDateString() : null

			return (
				<Tooltip content={auditor ? `Audited by ${auditor}${auditDateStr ? ` on ${auditDateStr}` : ''}` : auditDateStr}>
					<span className="flex items-center gap-1">
						{auditLink ? (
							<a
								href={auditLink}
								target="_blank"
								rel="noopener noreferrer"
								className="text-[var(--link-text)] hover:underline"
							>
								{auditor || 'Audited'}
							</a>
						) : (
							<span>{auditor || 'Audited'}</span>
						)}
					</span>
				</Tooltip>
			)
		},
		size: 120,
		enableSorting: false
	}
]
