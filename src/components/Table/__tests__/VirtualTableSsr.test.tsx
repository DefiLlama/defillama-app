import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { VirtualTable } from '../Table'

vi.mock('next/router', () => ({
	useRouter: () => ({ pathname: '/stablecoins' })
}))

type TestRow = {
	name: string
	mcap: number
}

const columnHelper = createColumnHelper<TestRow>()
const columns = [
	columnHelper.accessor('name', {
		header: 'Name',
		cell: (info) => info.getValue(),
		meta: { headerClassName: 'w-[180px]' }
	}),
	columnHelper.accessor('mcap', {
		header: 'Market Cap',
		cell: (info) => info.getValue(),
		meta: { headerClassName: 'w-[120px]', align: 'end' }
	})
]

function TestVirtualTable({ rowSize }: { rowSize?: number }) {
	const data: TestRow[] = Array.from({ length: 40 }, (_, index) => ({
		name: `Asset ${index + 1}`,
		mcap: index + 1
	}))
	const instance = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel()
	})

	return <VirtualTable instance={instance} rowSize={rowSize} />
}

describe('VirtualTable SSR', () => {
	it('renders an initial virtual window before browser measurement', () => {
		const html = renderToStaticMarkup(<TestVirtualTable />)

		expect(html).toContain('Asset 1')
		expect(html).toContain('Asset 2')
		expect(html).not.toContain('Asset 40')
	})

	it('applies the estimated row height to rendered virtual rows', () => {
		const html = renderToStaticMarkup(<TestVirtualTable rowSize={64} />)

		expect(html).toContain('height:64px')
	})
})
