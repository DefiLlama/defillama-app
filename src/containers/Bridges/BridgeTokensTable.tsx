import {
	createColumnHelper,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { useBlockExplorers } from '~/api/client'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import { getBlockExplorerNew } from '~/utils/blockExplorers'

type BridgeTokensTableRow = {
	symbol: string
	deposited?: number
	withdrawn?: number
	volume?: number
}

const columnHelper = createColumnHelper<BridgeTokensTableRow>()

export function BridgeTokensTable({ data }: { data: BridgeTokensTableRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'volume', desc: true }])
	const { data: blockExplorersData } = useBlockExplorers()

	const columns = React.useMemo(
		() => [
			columnHelper.accessor('symbol', {
				header: 'Token',
				cell: ({ getValue }) => {
					const value = getValue()
					if (!value) return 'Not found'

					const [symbol, token] = value.split('#')
					const explorer = token
						? getBlockExplorerNew({
								apiResponse: blockExplorersData ?? [],
								address: token,
								urlType: 'token'
							})
						: null

					if (!explorer) {
						return <span className="overflow-hidden text-ellipsis whitespace-nowrap">{symbol}</span>
					}

					return (
						<a href={explorer.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
							<span className="overflow-hidden text-ellipsis whitespace-nowrap">{symbol}</span>
							<Icon name="external-link" height={10} width={10} />
						</a>
					)
				},
				size: 120
			}),
			columnHelper.display({
				id: 'chainName',
				header: 'Chain',
				cell: ({ row }) => {
					const [, token] = row.original.symbol.split('#')
					if (!token) return null

					return (
						getBlockExplorerNew({
							apiResponse: blockExplorersData ?? [],
							address: token,
							urlType: 'token'
						})?.chainDisplayName ?? null
					)
				},
				size: 120,
				meta: {
					align: 'end'
				}
			}),
			columnHelper.accessor('deposited', {
				header: 'Deposited',
				cell: (info) => formattedNum(info.getValue() ?? 0, true),
				size: 120,
				meta: {
					align: 'end'
				}
			}),
			columnHelper.accessor('withdrawn', {
				header: 'Withdrawn',
				cell: (info) => formattedNum(info.getValue() ?? 0, true),
				size: 120,
				meta: {
					align: 'end'
				}
			}),
			columnHelper.accessor('volume', {
				header: 'Total Volume',
				cell: (info) => formattedNum(info.getValue(), true),
				size: 120,
				meta: {
					align: 'end'
				}
			})
		],
		[blockExplorersData]
	)

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}
