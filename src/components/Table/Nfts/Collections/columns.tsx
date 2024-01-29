import { ColumnDef } from '@tanstack/react-table'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { slug, formattedPercent } from '~/utils'
import { Name } from '../../shared'
import type { INftCollection } from '../types'
import styled from 'styled-components'

export const columns: ColumnDef<INftCollection>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ row }) => {
			const item = row.original

			return (
				<Name>
					<TokenLogo logo={item.image} fallbackLogo={item?.image} external />
					<CustomLink href={`/nfts/collection/${slug(item.collectionId)}`}>{`${item.name}`}</CustomLink>
				</Name>
			)
		},
		size: 200
	},
	{
		header: 'Floor Price',
		accessorKey: 'floorPrice',
		size: 120,
		cell: (info) => (
			<>
				{info.getValue() ? (
					<ValueWithETH>
						<span>{info.getValue() as string}</span>
						<svg fill="#777E91" data-eth xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 9">
							<path d="M5.56641 4.55935L2.76099 0L0 4.56239L2.78244 6.22185L5.56641 4.55935Z"></path>
							<path d="M5.56641 5.11627L2.77631 6.74082L0 5.11627L2.78244 8.99999L5.56641 5.11627Z"></path>
						</svg>
					</ValueWithETH>
				) : (
					''
				)}{' '}
			</>
		),

		meta: {
			align: 'end'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'floorPricePctChange1Day',
		size: 120,
		cell: (info) => formattedPercent(info.getValue()),
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'floorPricePctChange7Day',
		size: 120,
		cell: (info) => formattedPercent(info.getValue()),
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Volume 1d',
		accessorKey: 'volume1d',
		size: 120,
		cell: (info) => (
			<>
				{info.getValue() ? (
					<ValueWithETH>
						<span>{info.getValue() as string}</span>
						<svg fill="#777E91" data-eth xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 9">
							<path d="M5.56641 4.55935L2.76099 0L0 4.56239L2.78244 6.22185L5.56641 4.55935Z"></path>
							<path d="M5.56641 5.11627L2.77631 6.74082L0 5.11627L2.78244 8.99999L5.56641 5.11627Z"></path>
						</svg>
					</ValueWithETH>
				) : (
					''
				)}
			</>
		),

		meta: {
			align: 'end'
		}
	},
	{
		header: 'Volume 7d',
		accessorKey: 'volume7d',
		size: 120,
		cell: (info) => (
			<>
				{info.getValue() ? (
					<ValueWithETH>
						<span>{info.getValue() as string}</span>
						<svg fill="#777E91" data-eth xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 9">
							<path d="M5.56641 4.55935L2.76099 0L0 4.56239L2.78244 6.22185L5.56641 4.55935Z"></path>
							<path d="M5.56641 5.11627L2.77631 6.74082L0 5.11627L2.78244 8.99999L5.56641 5.11627Z"></path>
						</svg>
					</ValueWithETH>
				) : (
					''
				)}
			</>
		),

		meta: {
			align: 'end'
		}
	},
	{
		header: 'Sales 1d',
		accessorKey: 'sales1d',
		size: 120,
		cell: (info) => <>{info.getValue() ? info.getValue() : ''}</>,

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

const ValueWithETH = styled.span`
	display: flex;
	align-items: center;
	gap: 4px;
	justify-content: flex-end;
	flex-wrap: nowrap;

	& > *[data-eth] {
		height: 12px;
	}
`
