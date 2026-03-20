import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { IEquitiesFilingApiItem } from './api.types'
import { formatEquitiesDate } from './utils'

const columnHelper = createColumnHelper<IEquitiesFilingApiItem>()
const DEFAULT_SORTING_STATE = [{ id: 'filingDate', desc: true }]

const columns = [
	columnHelper.accessor('filingDate', {
		header: 'Filing Date',
		size: 120,
		cell: ({ getValue }) => formatEquitiesDate(getValue()),
		meta: { align: 'start' }
	}),
	columnHelper.accessor('reportDate', {
		header: 'Report Date',
		size: 120,
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
		meta: { align: 'start' }
	}),
	columnHelper.accessor('primaryDocumentUrl', {
		header: 'Source URL',
		size: 120,
		enableSorting: false,
		cell: ({ getValue }) => (
			<span className="flex w-full max-w-[80px] items-center justify-end">
				<a
					href={getValue()}
					target="_blank"
					rel="noopener noreferrer"
					className="flex flex-1 items-center justify-center gap-4 rounded-md bg-(--btn2-bg) p-1.5 hover:bg-(--btn2-hover-bg)"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
			</span>
		),
		meta: { align: 'end' }
	})
]

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
			csvFileName="equities-filings"
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
