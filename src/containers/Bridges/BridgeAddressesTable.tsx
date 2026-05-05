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

type BridgeAddressesTableRow = {
	address: string
	deposited?: number
	withdrawn?: number
	txs?: number
}
const columnHelper = createColumnHelper<BridgeAddressesTableRow>()

export function BridgeAddressesTable({ data }: { data: BridgeAddressesTableRow[] }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'withdrawn', desc: true }])
	const { data: blockExplorersData } = useBlockExplorers()

	const columns = React.useMemo(
		() => [
			columnHelper.accessor('address', {
				header: 'Address',
				cell: ({ getValue }) => {
					const value = getValue()
					if (!value) return 'Not found'

					const formattedValue = value.split(':')[1] ?? value
					const explorer = getBlockExplorerNew({
						apiResponse: blockExplorersData ?? [],
						address: value,
						urlType: 'address'
					})
					const truncatedValue = `${formattedValue.slice(0, 5)}...${formattedValue.slice(-4)}`

					if (!explorer) {
						return <span className="overflow-hidden text-ellipsis whitespace-nowrap">{truncatedValue}</span>
					}

					return (
						<a href={explorer.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
							<span className="overflow-hidden text-ellipsis whitespace-nowrap">{truncatedValue}</span>
							<Icon name="external-link" height={10} width={10} />
						</a>
					)
				},
				meta: {
					headerClassName: 'w-[120px]'
				}
			}),
			columnHelper.display({
				id: 'chainName',
				header: 'Chain',
				cell: ({ row }) =>
					getBlockExplorerNew({
						apiResponse: blockExplorersData ?? [],
						address: row.original.address,
						urlType: 'address'
					})?.chainDisplayName ?? null,
				meta: {
					headerClassName: 'w-[120px]',
					align: 'end'
				}
			}),
			columnHelper.accessor('deposited', {
				header: 'Deposited',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					headerClassName: 'w-[120px]',
					align: 'end'
				}
			}),
			columnHelper.accessor('withdrawn', {
				header: 'Withdrawn',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					headerClassName: 'w-[120px]',
					align: 'end'
				}
			}),
			columnHelper.accessor('txs', {
				header: 'Total Transactions',
				meta: {
					headerClassName: 'w-[120px]',
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
