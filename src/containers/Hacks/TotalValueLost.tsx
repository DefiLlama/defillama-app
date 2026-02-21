import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Select } from '~/components/Select/Select'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, tokenIconUrl } from '~/utils'
import type { IProtocolTotalValueLostInHacksByProtocol } from './types'

type ProtocolRow = IProtocolTotalValueLostInHacksByProtocol['protocols'][number]

const DEFAULT_SORTING_STATE = [{ id: 'Net User Loss', desc: true }]

const columns: Array<ColumnDef<ProtocolRow>> = [
	{
		header: 'Name',
		accessorFn: (row) => row.name,
		id: 'Name',
		cell: ({ row, getValue }) => {
			const name = String(getValue())
			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-6' : 'pl-0'}`}>
					{row.subRows?.length > 0 ? (
						<button className="absolute -left-4.5" onClick={row.getToggleExpandedHandler()}>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							)}
						</button>
					) : null}
					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo logo={tokenIconUrl(row.original.slug)} data-lgonly />

					<BasicLink
						href={row.original.route}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{name}
					</BasicLink>
				</span>
			)
		}
	},
	{
		header: 'Total Hacked',
		accessorFn: (row) => row.totalHacked,
		id: 'Total Hacked',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'center'
		}
	},
	{
		header: 'Returned Funds',
		accessorFn: (row) => row.returnedFunds,
		id: 'Returned Funds',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'center'
		}
	},
	{
		header: 'Net User Loss',
		accessorFn: (row) => row.totalHacked - row.returnedFunds,
		id: 'Net User Loss',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'center',
			headerHelperText: 'Total Hacked - Returned Funds'
		}
	}
]

const columnIds: string[] = columns.map((c) => c.id).filter((id): id is string => id != null)

export function TotalValueLostContainer({ protocols }: IProtocolTotalValueLostInHacksByProtocol) {
	const [selectedColumns, setSelectedColumns] = React.useState<Array<string> | string>([
		'Name',
		'Total Hacked',
		'Returned Funds',
		'Net User Loss'
	])

	const filteredColumns = React.useMemo(() => {
		const selected = Array.isArray(selectedColumns) ? selectedColumns : [selectedColumns]
		return columns.filter((c) => c.id != null && selected.includes(c.id))
	}, [selectedColumns])

	return (
		<TableWithSearch
			data={protocols}
			columns={filteredColumns}
			placeholder="Search..."
			columnToSearch="Name"
			header="Total Value Lost in Hacks"
			compact
			customFilters={() => (
				<Select
					allValues={columnIds}
					selectedValues={selectedColumns}
					setSelectedValues={setSelectedColumns}
					label="Columns"
					labelType="smol"
					variant="filter-responsive"
				/>
			)}
			csvFileName="total-value-lost-in-hacks.csv"
			sortingState={DEFAULT_SORTING_STATE}
		/>
	)
}
