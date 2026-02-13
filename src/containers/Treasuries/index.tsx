import type { ColumnDef } from '@tanstack/react-table'
import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import Layout from '~/layout'
import { formattedNum, getDominancePercent, tokenIconUrl } from '~/utils'
import type { ITreasuryRow } from './types'

const pageName = ['Projects', 'ranked by', 'Treasury']
const entityPageName = ['Entities', 'ranked by', 'Treasury']

export function Treasuries({ data, entity }: { data: ITreasuryRow[]; entity: boolean }) {
	const tableColumns = useMemo(
		() =>
			entity
				? columns.filter((c) => {
						const key = 'accessorKey' in c ? String(c.accessorKey) : ''
						return !['ownTokens', 'coreTvl', 'mcap'].includes(key)
					})
				: columns,
		[entity]
	)

	const prepareCsv = () => {
		const headers = [
			'Name',
			'Category',
			'Own Tokens',
			'Stablecoins',
			'Major Tokens',
			'Other Tokens',
			'Total excl. own tokens',
			'Total Treasury',
			'Mcap',
			'Change 1d',
			'Change 7d',
			'Change 1m'
		]
		const dataToDownload = data.map((row) => {
			const csvRow: Record<string, string | number> = {
				Name: row.name,
				Category: row.category,
				'Own Tokens': row.ownTokens,
				Stablecoins: row.stablecoins,
				'Major Tokens': row.majors,
				'Other Tokens': row.others,
				'Total excl. own tokens': row.coreTvl,
				'Total Treasury': row.tvl,
				Mcap: row.mcap ?? '',
				'Change 1d': row.change_1d ?? '',
				'Change 7d': row.change_7d ?? '',
				'Change 1m': row.change_1m ?? ''
			}
			return csvRow
		})
		const dataRows: (string | number)[][] = dataToDownload.map((row) => headers.map((header) => row[header]))
		const rows: (string | number)[][] = [headers, ...dataRows]
		return { filename: 'treasuries.csv', rows }
	}

	const sortingState = entity ? [{ id: 'tvl', desc: true }] : [{ id: 'coreTvl', desc: true }]

	return (
		<Layout
			title={`Treasuries - DefiLlama`}
			description={`Track treasuries on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`blockchain project treasuries, blockchain entity treasuries, protocol treasuries, entity treasuries`}
			canonicalUrl={entity ? `/entities` : `/treasuries`}
			pageName={entity ? entityPageName : pageName}
		>
			<TableWithSearch
				data={data}
				columns={tableColumns}
				columnToSearch={'name'}
				placeholder={'Search projects...'}
				header={'Treasuries'}
				sortingState={sortingState}
				customFilters={
					<>
						<CSVDownloadButton prepareCsv={prepareCsv} />
					</>
				}
			/>
		</Layout>
	)
}

const columns: ColumnDef<ITreasuryRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const name = getValue<string>().split(' (treasury)')[0]
			const slug = row.original.slug.split('-(treasury)')[0]

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={tokenIconUrl(name)} data-lgonly />
					<BasicLink
						href={`/protocol/${slug}?treasury=true&tvl=false`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{name}
					</BasicLink>
				</span>
			)
		},
		size: 220
	},
	{
		header: 'Breakdown',
		accessorKey: 'tokenBreakdowns',
		id: 'tokenBreakdowns0',
		enableSorting: false,
		cell: (info) => {
			const breakdown = info.getValue<ITreasuryRow['tokenBreakdowns']>()
			const entries = Object.entries(breakdown) as Array<[keyof ITreasuryRow['tokenBreakdowns'], number]>
			let totalBreakdown = 0

			for (const [, val] of entries) {
				totalBreakdown += val
			}

			const breakdownDominance = new Map<keyof ITreasuryRow['tokenBreakdowns'], number>()

			for (const [key, val] of entries) {
				breakdownDominance.set(key, getDominancePercent(val, totalBreakdown))
			}

			const dominance = Array.from(breakdownDominance.entries()).sort((a, b) => b[1] - a[1])

			if (totalBreakdown < 1) {
				return <></>
			}

			return (
				<Tooltip
					content={<BreakdownTooltipContent dominance={dominance} protocolName={info.row.original.name} />}
					render={<button />}
					className="ml-auto flex h-5 w-full! flex-nowrap items-center bg-white"
				>
					{dominance.map((dom) => {
						const color = breakdownColor(dom[0])

						return (
							<div
								key={dom[0] + dom[1] + info.row.original.name}
								style={{ width: `${dom[1]}%`, background: color }}
								className="h-5"
							/>
						)
					})}
				</Tooltip>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stablecoins',
		accessorKey: 'stablecoins',
		id: 'stablecoins',
		cell: (info) => {
			return <>{formattedNum(info.getValue(), true)}</>
		},
		size: 115,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Majors (BTC, ETH)',
		accessorKey: 'majors',
		id: 'majors',
		cell: (info) => {
			return <>{formattedNum(info.getValue(), true)}</>
		},
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Own Tokens',
		accessorKey: 'ownTokens',
		cell: (info) => {
			return <>{formattedNum(info.getValue(), true)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Others',
		accessorKey: 'others',
		id: 'others',
		cell: (info) => {
			return <>{formattedNum(info.getValue(), true)}</>
		},
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total excl. own tokens',
		accessorKey: 'coreTvl',
		id: 'coreTvl',
		cell: (info) => {
			return <>{formattedNum(info.getValue(), true)}</>
		},
		size: 185,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Treasury',
		accessorKey: 'tvl',
		id: 'tvl',
		cell: (info) => {
			return <>{formattedNum(info.getValue(), true)}</>
		},
		size: 135,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Mcap',
		accessorKey: 'mcap',
		id: 'mcap',
		cell: (info) => {
			const value = info.getValue<number | null>()
			return <>{value === null ? null : formattedNum(value, true)}</>
		},
		size: 128,
		meta: {
			align: 'end'
		}
	}
]

const BREAKDOWN_COLORS: Record<string, string> = {
	stablecoins: '#16a34a',
	majors: '#2563eb',
	ownTokens: '#f97316',
	others: '#6d28d9'
}

const BREAKDOWN_LABELS: Record<string, string> = {
	stablecoins: 'Stablecoins',
	majors: 'Majors',
	ownTokens: 'Own Tokens',
	others: 'Others'
}

const breakdownColor = (type: string) => BREAKDOWN_COLORS[type] ?? '#f85149'

const formatBreakdownType = (type: string) => BREAKDOWN_LABELS[type] ?? type

const Breakdown = ({ data }: { data: [string, number] }) => {
	const color = breakdownColor(data[0])
	const name = `${formatBreakdownType(data[0])} (${data[1]}%)`

	return (
		<span className="flex flex-nowrap items-center gap-1">
			<span
				style={{ '--color': color } as CSSProperties & Record<`--${string}`, string>}
				className="h-4 w-4 rounded-xs bg-(--color)"
			></span>
			<span>{name}</span>
		</span>
	)
}

const BreakdownTooltipContent = ({
	dominance,
	protocolName
}: {
	dominance: [string, number][]
	protocolName: string
}) => {
	return (
		<span className="flex flex-col gap-1">
			{dominance.map((dom) => (
				<Breakdown data={dom} key={dom[0] + dom[1] + protocolName + 'tooltip-content'} />
			))}
		</span>
	)
}
