import { useState, useEffect, useMemo } from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	ColumnFiltersState,
	ColumnDef
} from '@tanstack/react-table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { download, formattedNum, getDominancePercent, tokenIconUrl } from '~/utils'
import Layout from '~/layout'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

export function Treasuries({ data, entity }) {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [sorting, setSorting] = useState<SortingState>([])
	const tableColumns = useMemo(
		() => (entity ? columns.filter((c: any) => !['ownTokens', 'coreTvl'].includes(c.accessorKey)) : columns),
		[entity]
	)
	const instance = useReactTable({
		data,
		columns: entity ? columns.filter((c: any) => !['ownTokens', 'coreTvl'].includes(c.accessorKey)) : columns,
		state: {
			columnFilters,
			sorting
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = useState('')

	const downloadCSV = () => {
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
			return {
				Name: row.name,
				Category: row.category,
				'Own Tokens': row.ownTokens,
				Stablecoins: row.stablecoins,
				'Major Tokens': row.majors,
				'Other Tokens': row.others,
				'Total excl. own tokens': row.coreTvl,
				'Total Treasury': row.tvl,
				Mcap: row.mcap,
				'Change 1d': row.change_1d,
				'Change 7d': row.change_7d,
				'Change 1m': row.change_1m
			}
		})
		const csv = [headers.join(',')]
			.concat(dataToDownload.map((row) => headers.map((header) => row[header]).join(',')))
			.join('\n')
		download('treasuries.csv', csv)
	}

	useEffect(() => {
		const projectsColumns = instance.getColumn('name')
		const id = setTimeout(() => {
			projectsColumns.setFilterValue(projectName)
		}, 200)
		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<Layout title={`${entity ? 'Entities' : 'Treasuries'} - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />
			<TableWithSearch
				data={data}
				columns={tableColumns}
				columnToSearch={'name'}
				placeholder={'Search projects...'}
				header={'Treasuries'}
				customFilters={
					<>
						<CSVDownloadButton onClick={downloadCSV} className="min-h-[34px]" />
					</>
				}
			/>
		</Layout>
	)
}

export const columns: ColumnDef<any>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			const name = (getValue() as string).split(' (treasury)')[0]
			const slug = (row.original.slug as string).split('-(treasury)')[0]

			return (
				<span className="flex items-center gap-2 relative">
					<span className="shrink-0">{index + 1}</span>
					<TokenLogo logo={tokenIconUrl(name)} data-lgonly />
					<BasicLink
						href={`/protocol/${slug}#treasury`}
						className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis"
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
			const breakdown = info.getValue() as { [type: string]: number }
			let totalBreakdown = 0

			for (const type in breakdown) {
				totalBreakdown += breakdown[type]
			}

			const breakdownDominance = {}

			for (const value in breakdown) {
				breakdownDominance[value] = getDominancePercent(breakdown[value], totalBreakdown)
			}

			const dominance = Object.entries(breakdownDominance).sort(
				(a: [string, number], b: [string, number]) => b[1] - a[1]
			)

			if (totalBreakdown < 1) {
				return <></>
			}

			return (
				<Tooltip content={<TooltipContent dominance={dominance} protocolName={info.row.original.name} />}>
					<span className="h-5 w-full! ml-auto bg-white flex items-center flex-nowrap">
						{dominance.map((dom) => {
							const color = breakdownColor(dom[0])
							const name = `${formatBreakdownType(dom[0])} (${dom[1]}%)`

							return (
								<div
									key={dom[0] + dom[1] + info.row.original.name}
									style={{ width: `${dom[1]}%`, background: color }}
									className="h-5"
								/>
							)
						})}
					</span>
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
		id: 'total-treasury',
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
			return <>{info.getValue() === null ? null : formattedNum(info.getValue(), true)}</>
		},
		size: 128,
		meta: {
			align: 'end'
		}
	}
]

const breakdownColor = (type) => {
	if (type === 'stablecoins') {
		return '#16a34a'
	}

	if (type === 'majors') {
		return '#2563eb'
	}

	if (type === 'ownTokens') {
		return '#f97316'
	}

	if (type === 'others') {
		return '#6d28d9'
	}

	return '#f85149'
}

const formatBreakdownType = (type) => {
	if (type === 'stablecoins') {
		return 'Stablecoins'
	}

	if (type === 'majors') {
		return 'Majors'
	}

	if (type === 'ownTokens') {
		return 'Own Tokens'
	}

	if (type === 'others') {
		return 'Others'
	}

	return type
}

const Breakdown = ({ data }) => {
	const color = breakdownColor(data[0])
	const name = `${formatBreakdownType(data[0])} (${data[1]}%)`

	return (
		<span className="flex items-center flex-nowrap gap-1">
			<span style={{ '--color': color } as any} className="h-4 w-4 bg-(--color) rounded-xs"></span>
			<span>{name}</span>
		</span>
	)
}

const TooltipContent = ({ dominance, protocolName }) => {
	return (
		<span className="flex flex-col gap-1">
			{dominance.map((dom) => (
				<Breakdown data={dom} key={dom[0] + dom[1] + protocolName + 'tooltip-content'} />
			))}
		</span>
	)
}
