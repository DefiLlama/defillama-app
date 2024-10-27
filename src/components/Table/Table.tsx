import * as React from 'react'
import { Table, flexRender, RowData } from '@tanstack/react-table'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import styled from 'styled-components'
import SortIcon from './SortIcon'
import { QuestionHelper } from '../QuestionHelper'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'

interface ITableProps {
	instance: Table<any>
	skipVirtualization?: boolean
	rowSize?: number
	columnResizeMode?: 'onChange' | 'onEnd'
	renderSubComponent?: ({ row }: { row: any }) => JSX.Element
	cellStyles?: React.CSSProperties
	stripedBg?: boolean
}

declare module '@tanstack/table-core' {
	interface ColumnMeta<TData extends RowData, TValue> {
		align?: 'start' | 'end'
		headerHelperText?: string
	}
}

export default function VirtualTable({
	instance,
	skipVirtualization,
	columnResizeMode,
	rowSize,
	renderSubComponent,
	cellStyles = {},
	stripedBg = false,
	...props
}: ITableProps) {
	const router = useRouter()
	const [tableTop, setTableTop] = React.useState(0)
	const tableContainerRef = React.useRef<HTMLTableSectionElement>(null)

	const { rows } = instance.getRowModel()

	React.useEffect(() => {
		if (!skipVirtualization && tableContainerRef?.current) {
			setTableTop(tableContainerRef.current.offsetTop)
		}
	}, [skipVirtualization])

	React.useEffect(() => {
		if (!skipVirtualization) {
		}
	}, [skipVirtualization])

	React.useEffect(() => {
		function focusSearchBar(e: KeyboardEvent) {
			if (!skipVirtualization && (e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
				toast.error("Native browser search isn't well supported, please use search boxes / ctrl-k / cmd-k instead", {
					id: 'native-search-warn',
					icon: <Icon name="alert-triangle" color="red" height={16} width={16} style={{ flexShrink: 0 }} />
				})
			}
		}

		window.addEventListener('keydown', focusSearchBar)

		return () => window.removeEventListener('keydown', focusSearchBar)
	}, [])

	const rowVirtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => rowSize || 50,
		overscan: 5,
		scrollMargin: tableTop
	})

	const virtualItems = rowVirtualizer.getVirtualItems()
	const isChainPage =
		router.pathname === '/' || router.pathname.startsWith('/chain') || router.pathname.startsWith('/protocols')
	let minTableWidth = 0
	for (const headerGroup of instance.getHeaderGroups()) {
		for (const header of headerGroup.headers) {
			minTableWidth += header.getSize() ?? 0
		}
	}

	const tableHeaderRef = React.useRef<HTMLDivElement>()

	React.useEffect(() => {
		const onScroll = () => {
			const tableWrapperEl = document.getElementById('table-wrapper')
			const tableHeaderDuplicate = document.getElementById('table-header-dup')

			if (
				!skipVirtualization &&
				tableHeaderRef.current &&
				tableWrapperEl &&
				tableWrapperEl.getBoundingClientRect().top <= 20 &&
				tableHeaderDuplicate
			) {
				tableHeaderRef.current.style.position = 'fixed'
				tableHeaderRef.current.style.top = '0px'
				tableHeaderRef.current.style.width = `${tableWrapperEl.offsetWidth}px`
				tableHeaderRef.current.style['overflow-x'] = 'overlay'
				tableHeaderDuplicate.style.height = `${instance.getHeaderGroups().length * 45}px`
			} else {
				tableHeaderRef.current.style.position = 'relative'
				tableHeaderRef.current.style['overflow-x'] = 'initial'
				tableHeaderDuplicate.style.height = '0px'
			}
		}

		window.addEventListener('scroll', onScroll)

		return () => window.removeEventListener('scroll', onScroll)
	}, [skipVirtualization, instance])

	React.useEffect(() => {
		const tableWrapperEl = document.getElementById('table-wrapper')

		const onScroll = () => {
			if (!skipVirtualization && tableHeaderRef.current) {
				tableHeaderRef.current.scrollLeft = tableWrapperEl.scrollLeft
			} else {
				tableHeaderRef.current.scrollLeft = 0
			}
		}

		tableWrapperEl.addEventListener('scroll', onScroll)

		return () => tableWrapperEl.removeEventListener('scroll', onScroll)
	}, [skipVirtualization])

	return (
		<Wrapper ref={tableContainerRef} id="table-wrapper" {...props}>
			<div
				ref={tableHeaderRef}
				id="table-header"
				style={{
					display: 'flex',
					flexDirection: 'column',
					zIndex: 10,
					...(skipVirtualization ? { minWidth: `${minTableWidth}px` } : {})
				}}
			>
				{instance.getHeaderGroups().map((headerGroup) => (
					<div key={headerGroup.id} style={{ display: 'flex', position: 'relative' }}>
						{headerGroup.headers.map((header) => {
							// get header text alignment
							const meta = header.column.columnDef.meta
							const value = flexRender(header.column.columnDef.header, header.getContext())

							return (
								<Cell key={header.id} data-chainpage={isChainPage} style={{ minWidth: `${header.getSize() ?? 100}px` }}>
									<TableHeader
										align={
											meta?.align ??
											(headerGroup.depth === 0 && instance.getHeaderGroups().length > 1 ? 'center' : 'start')
										}
									>
										{header.isPlaceholder ? null : (
											<>
												{header.column.getCanSort() ? (
													<button onClick={() => header.column.toggleSorting()}>{value}</button>
												) : (
													value
												)}
											</>
										)}
										{meta?.headerHelperText && <Helper text={meta?.headerHelperText} />}
										{header.column.getCanSort() && <SortIcon dir={header.column.getIsSorted()} />}
									</TableHeader>
								</Cell>
							)
						})}
					</div>
				))}
			</div>
			<div id="table-header-dup"></div>
			<div
				style={
					skipVirtualization
						? { minWidth: `${minTableWidth}px` }
						: {
								height: `${rowVirtualizer.getTotalSize()}px`,
								width: '100%',
								position: 'relative',
								...(instance.getHeaderGroups().length === 1 ? { minWidth: `${minTableWidth}px` } : {})
						  }
				}
			>
				{(skipVirtualization ? rows : virtualItems).map((row, i) => {
					const rowTorender = skipVirtualization ? row : rows[row.index]
					const trStyle: React.CSSProperties = skipVirtualization
						? {
								display: 'flex',
								position: 'relative'
						  }
						: {
								position: 'absolute',
								top: `${row.start - rowVirtualizer.options.scrollMargin}px`,
								left: 0,
								width: '100%',
								height: `${row.size}px`,
								opacity: rowTorender.original.disabled ? 0.3 : 1,
								display: 'flex'
						  }

					return (
						<React.Fragment key={rowTorender.id}>
							<div style={trStyle}>
								{rowTorender.getVisibleCells().map((cell) => {
									// get header text alignment
									const textAlign = cell.column.columnDef.meta?.align ?? 'start'

									return (
										<Cell
											ligther={stripedBg && i % 2 === 0}
											key={cell.id}
											data-chainpage={isChainPage}
											style={{ minWidth: `${cell.column.getSize() ?? 100}px`, textAlign, ...(cellStyles || {}) }}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</Cell>
									)
								})}
							</div>
							{renderSubComponent && rowTorender.getIsExpanded() && (
								<>
									<div>{renderSubComponent({ row: rowTorender })}</div>
								</>
							)}
						</React.Fragment>
					)
				})}
			</div>
		</Wrapper>
	)
}

export const Wrapper = styled.div`
	isolation: isolate;
	position: relative;
	width: 100%;
	max-width: calc(100vw - 32px);
	color: ${({ theme }) => theme.text1};
	background-color: ${({ theme }) => theme.background};
	border: 1px solid ${({ theme }) => theme.bg3};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
	border-radius: 12px;
	overflow-x: auto;
	margin: 0 auto;

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		max-width: calc(100vw - 276px);
	}

	a:hover {
		text-decoration: underline;
	}
`

const Cell = styled.div<{ ligther?: boolean }>`
	flex: 1;
	flex-shrink: 0;
	padding: 12px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	background-color: ${({ theme, ligther }) => (ligther && theme.mode === 'dark' ? '#1c1d22' : theme.background)};
	border-bottom: 1px solid ${({ theme }) => theme.divider};
	border-right: 1px solid ${({ theme }) => theme.divider};
	&[data-chainpage='true'] {
		background-color: ${({ theme }) => theme.bg6};
	}
	&:first-child {
		position: sticky;
		left: 0;
		z-index: 1;
	}
`

interface ITableHeader {
	align: 'start' | 'end' | 'center'
}

const TableHeader = styled.span<ITableHeader>`
	display: flex;
	justify-content: ${({ align }) => (align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start')};
	align-items: center;
	flex-wrap: nowrap;
	gap: 4px;
	font-weight: 500;
	position: relative;

	& > * {
		white-space: nowrap;
	}

	svg {
		flex-shrink: 0;
	}

	button {
		padding: 0;
	}
`

const Helper = styled(QuestionHelper)`
	color: ${({ theme }) => theme.text1};
`
