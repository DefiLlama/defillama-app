import { createColumnHelper } from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { Select } from '~/components/Select/Select'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum } from '~/utils'
import type { IProtocolTotalValueLostInHacksByProtocol } from './types'

type ProtocolRow = IProtocolTotalValueLostInHacksByProtocol['protocols'][number]
const columnHelper = createColumnHelper<ProtocolRow>()

const DEFAULT_SORTING_STATE = [{ id: 'Net User Loss', desc: true }]

const columns = [
	columnHelper.accessor((row) => row.name, {
		id: 'Name',
		header: 'Name',
		cell: ({ row, getValue }) => {
			const name = getValue()
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

					<TokenLogo name={row.original.slug} kind="token" data-lgonly alt={`Logo of ${row.original.slug}`} />

					<BasicLink
						href={row.original.route}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{name}
					</BasicLink>
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[min(240px,40vw)]'
		}
	}),
	columnHelper.accessor((row) => row.totalHacked, {
		id: 'Total Hacked',
		header: 'Total Hacked',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[130px]',
			align: 'center'
		}
	}),
	columnHelper.accessor((row) => row.returnedFunds, {
		id: 'Returned Funds',
		header: 'Returned Funds',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[150px]',
			align: 'center'
		}
	}),
	columnHelper.accessor((row) => row.totalHacked - row.returnedFunds, {
		id: 'Net User Loss',
		header: 'Net User Loss',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[140px]',
			align: 'center',
			headerHelperText: 'Total Hacked - Returned Funds'
		}
	})
]

const columnIds: string[] = columns.map((c) => c.id).filter((id): id is string => id != null)

export function TotalValueLostContainer({ protocols }: IProtocolTotalValueLostInHacksByProtocol) {
	const [selectedColumns, setSelectedColumns] = React.useState<string[]>([
		'Name',
		'Total Hacked',
		'Returned Funds',
		'Net User Loss'
	])

	const filteredColumns = React.useMemo(() => {
		return columns.filter((c) => c.id != null && selectedColumns.includes(c.id))
	}, [selectedColumns])

	return (
		<TableWithSearch
			data={protocols}
			columns={filteredColumns}
			placeholder="Search..."
			columnToSearch="Name"
			header="Total Value Lost in Hacks"
			headingAs="h1"
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
			csvFileName="total-value-lost-in-hacks"
			sortingState={DEFAULT_SORTING_STATE}
		/>
	)
}
