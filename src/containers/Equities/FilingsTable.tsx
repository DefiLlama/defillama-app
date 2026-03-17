import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import type { IEquitiesFilingApiItem } from './api.types'
import { formatEquitiesDate } from './utils'

const columnHelper = createColumnHelper<IEquitiesFilingApiItem>()
const DEFAULT_SORTING_STATE = [{ id: 'filingDate', desc: true }]

const columns = [
	columnHelper.accessor('filingDate', {
		header: 'Filing Date',
		size: 108,
		cell: ({ getValue }) => formatEquitiesDate(getValue()),
		meta: { align: 'start' }
	}),
	columnHelper.accessor('reportDate', {
		header: 'Report Date',
		size: 108,
		cell: ({ getValue }) => formatEquitiesDate(getValue()),
		meta: { align: 'start' }
	}),
	columnHelper.accessor('form', {
		header: 'Form',
		size: 84,
		meta: { align: 'start' }
	}),
	columnHelper.accessor('documentDescription', {
		header: 'Description',
		size: 520,
		filterFn: (row, _columnId, filterValue) => {
			const query = String(filterValue).trim().toLowerCase()
			if (!query) return true
			return (
				row.original.documentDescription.toLowerCase().includes(query) ||
				row.original.form.toLowerCase().includes(query)
			)
		},
		cell: ({ getValue, row }) => (
			<a
				href={row.original.primaryDocumentUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="text-(--link-text) hover:underline"
			>
				{getValue()}
			</a>
		),
		meta: { align: 'start' }
	}),
	columnHelper.accessor('primaryDocumentUrl', {
		header: 'SEC',
		size: 84,
		enableSorting: false,
		cell: ({ getValue }) => (
			<a href={getValue()} target="_blank" rel="noopener noreferrer" className="text-(--link-text) hover:underline">
				Open
			</a>
		),
		meta: { align: 'end' }
	})
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: {
		filingDate: 108,
		reportDate: 108,
		form: 84,
		documentDescription: 360,
		primaryDocumentUrl: 84
	},
	640: {
		filingDate: 108,
		reportDate: 108,
		form: 84,
		documentDescription: 420,
		primaryDocumentUrl: 84
	},
	1024: {
		filingDate: 116,
		reportDate: 116,
		form: 88,
		documentDescription: 520,
		primaryDocumentUrl: 88
	},
	1536: {
		filingDate: 120,
		reportDate: 120,
		form: 92,
		documentDescription: 620,
		primaryDocumentUrl: 96
	}
}

const columnOrders: ColumnOrdersByBreakpoint = {
	0: ['filingDate', 'form', 'documentDescription', 'reportDate', 'primaryDocumentUrl'],
	640: ['filingDate', 'reportDate', 'form', 'documentDescription', 'primaryDocumentUrl']
}

export function EquitiesFilingsTable({
	filings,
	filingForms
}: {
	filings: IEquitiesFilingApiItem[]
	filingForms: string[]
}) {
	const [selectedForm, setSelectedForm] = useState<string>('All')

	const filteredFilings = useMemo(
		() => (selectedForm === 'All' ? filings : filings.filter((filing) => filing.form === selectedForm)),
		[filings, selectedForm]
	)

	return (
		<TableWithSearch
			data={filteredFilings}
			columns={columns}
			placeholder="Search filings"
			columnToSearch="documentDescription"
			header={null}
			sortingState={DEFAULT_SORTING_STATE}
			rowSize={52}
			compact
			columnSizes={columnSizes}
			columnOrders={columnOrders}
			csvFileName="equity-filings"
			customFilters={
				<label className="flex items-center gap-2 text-sm">
					<span className="text-(--text-form)">Form</span>
					<select
						value={selectedForm}
						onChange={(e) => setSelectedForm(e.currentTarget.value)}
						className="rounded-md border border-(--form-control-border) bg-white px-2 py-1 text-black dark:bg-black dark:text-white"
					>
						<option value="All">All</option>
						{filingForms.map((form) => (
							<option key={form} value={form}>
								{form}
							</option>
						))}
					</select>
				</label>
			}
		/>
	)
}
