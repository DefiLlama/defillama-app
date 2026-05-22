import { createColumnHelper, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PaginatedTable } from '../PaginatedTable'

vi.mock('~/components/Icon', () => ({
	Icon: ({ name }: { name: string }) => <span>{name}</span>
}))

vi.mock('~/components/Tooltip', () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

const columnHelper = createColumnHelper<{ name: string }>()

function TestTable({ rowCount, initialPageSize = 10 }: { rowCount: number; initialPageSize?: number }) {
	const data = Array.from({ length: rowCount }, (_, index) => ({ name: `row-${index + 1}` }))
	const table = useReactTable({
		data,
		columns: [
			columnHelper.accessor('name', {
				header: 'Name'
			})
		],
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: initialPageSize
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	return <PaginatedTable table={table} pageSizeOptions={[10, 20, 30, 50] as const} />
}

describe('PaginatedTable', () => {
	it('hides pagination controls when there are ten or fewer rows', () => {
		const html = renderToStaticMarkup(<TestTable rowCount={10} />)

		expect(html).not.toContain('Page 1 of')
		expect(html).not.toContain('Rows per page')
	})

	it('hides rows-per-page when only one valid option remains', () => {
		const html = renderToStaticMarkup(<TestTable rowCount={11} />)

		expect(html).toContain('Page 1 of 2')
		expect(html).not.toContain('Rows per page')
	})

	it('shows rows-per-page when at least two valid options remain', () => {
		const html = renderToStaticMarkup(<TestTable rowCount={20} />)

		expect(html).toContain('Page 1 of 2')
		expect(html).toContain('Rows per page')
	})

	it('keeps rows-per-page visible when the current page size exceeds the filtered row count', () => {
		const html = renderToStaticMarkup(<TestTable rowCount={11} initialPageSize={20} />)

		expect(html).toContain('Rows per page')
		expect(html).toContain('<option value="10">10</option>')
		expect(html).toContain('<option value="20" selected="">20</option>')
	})
})
