import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { Search } from 'react-feather'
import styled from 'styled-components'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnOrderState,
	ColumnFiltersState,
	getFilteredRowModel
} from '@tanstack/react-table'
import VirtualTable from '~/components/Table/Table'
import { hacksColumns, hacksColumnOrders } from '~/components/Table/Defi/columns'
import type { IBarChartProps } from '~/components/ECharts/types'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper } from '~/components'
import useWindowSize from '~/hooks/useWindowSize'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const columnResizeMode = 'onChange'

function HacksTable({ data }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const [projectName, setProjectName] = React.useState('')
	const windowSize = useWindowSize()
	const instance = useReactTable({
		data: data,
		columns: hacksColumns,
		columnResizeMode,
		state: {
			columnFilters,
			columnOrder,
			sorting
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? hacksColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	React.useEffect(() => {
		const projectsColumns = instance.getColumn('name')

		const id = setTimeout(() => {
			projectsColumns.setFilterValue(projectName)
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<>
			<TableFilters>
				<SearchIcon size={16} />

				<input
					value={projectName}
					onChange={(e) => {
						setProjectName(e.target.value)
					}}
					placeholder="Search projects..."
				/>
			</TableFilters>

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</>
	)
}

const HacksContainer = ({ data, monthlyHacks, totalHacked, totalHackedDefi, totalRugs }) => {
	return (
		<Layout title={`Hacks - DefiLlama`} defaultSEO>
			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Value Hacked (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>{totalHacked}b</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h1>Total Value Hacked in DeFi (USD)</h1>
						<p style={{ '--tile-text-color': '#bd3399' } as React.CSSProperties}>{totalHackedDefi}b</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h1>Total Value Hacked in Bridges (USD)</h1>
						<p style={{ '--tile-text-color': '#bd3399' } as React.CSSProperties}>{totalRugs}b</p>
					</BreakpointPanel>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper">
					{monthlyHacks && (
						<BarChart
							chartData={Object.entries(monthlyHacks).map((t) => [new Date(t[0]).getTime() / 1e3, Number(t[1]) * 1e6])}
							title="Monthly sum"
						/>
					)}
				</BreakpointPanel>
			</ChartAndValuesWrapper>
			<HacksTable data={data} />
		</Layout>
	)
}

const SearchIcon = styled(Search)`
	position: absolute;
	top: 8px;
	left: 8px;
	color: ${({ theme }) => theme.text3};
`

const TableFilters = styled.div`
	display: flex;
	aling-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin: 0 0 -20px;
	position: relative;

	input {
		width: 100%;
		margin-right: auto;
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};

		font-size: 0.875rem;
		border: none;
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		input {
			max-width: 400px;
		}
	}
`

export default HacksContainer
