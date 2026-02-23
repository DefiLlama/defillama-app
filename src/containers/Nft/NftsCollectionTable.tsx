import {
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { slug } from '~/utils'

interface INftCollection {
	name: string
	collectionId: string
	floorPrice: number
	floorPrice1Day: number
	floorPrice7Day: number
	floorPricePctChange1Day: number
	floorPricePctChange7Day: number
	image: string
	onSaleCount: number
	totalSupply: number
	volume1d: number
	volume7d: number
	sales1d: number
}

const EthIcon = () => (
	<svg fill="#777E91" height={12} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 9">
		<path d="M5.56641 4.55935L2.76099 0L0 4.56239L2.78244 6.22185L5.56641 4.55935Z"></path>
		<path d="M5.56641 5.11627L2.77631 6.74082L0 5.11627L2.78244 8.99999L5.56641 5.11627Z"></path>
	</svg>
)

const EthValueCell = ({ value }: { value: unknown }) =>
	value != null ? (
		<span className="flex flex-nowrap items-center justify-end gap-1">
			<span>{String(value)}</span>
			<EthIcon />
		</span>
	) : null

const columns: ColumnDef<INftCollection>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ row }) => {
			const item = row.original

			return (
				<span className="flex items-center gap-2">
					<TokenLogo logo={item.image} fallbackLogo={item?.image} />
					<BasicLink
						href={`/nfts/collection/${slug(item.collectionId)}`}
						className="text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>{`${item.name}`}</BasicLink>
				</span>
			)
		},
		size: 200
	},
	{
		header: 'Floor Price',
		accessorKey: 'floorPrice',
		size: 120,
		cell: (info) => <EthValueCell value={info.getValue()} />,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'floorPricePctChange1Day',
		size: 120,
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'floorPricePctChange7Day',
		size: 120,
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Volume 1d',
		accessorKey: 'volume1d',
		size: 120,
		cell: (info) => <EthValueCell value={info.getValue()} />,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Volume 7d',
		accessorKey: 'volume7d',
		size: 120,
		cell: (info) => <EthValueCell value={info.getValue()} />,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Sales 1d',
		accessorKey: 'sales1d',
		size: 120,
		cell: (info) => <>{info.getValue() != null ? String(info.getValue()) : null}</>,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Supply',
		accessorKey: 'totalSupply',
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'On Sale',
		accessorKey: 'onSaleCount',
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

export function NftsCollectionTable({ data }: { data: Array<INftCollection> }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'volume1d', desc: true }])

	const instance = useReactTable({
		data,
		columns,
		state: {
			columnFilters,
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [collectionName, setCollectionName] = useTableSearch({ instance, columnToSearch: 'name' })

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				<h1 className="mr-auto text-xl font-semibold">NFT Collection Metrics</h1>
				<label className="relative w-full sm:max-w-[280px]">
					<span className="sr-only">Search collections...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						value={collectionName}
						onChange={(e) => {
							setCollectionName(e.target.value)
						}}
						placeholder="Search collections..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
