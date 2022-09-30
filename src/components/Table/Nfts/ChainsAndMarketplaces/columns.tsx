import { ColumnDef } from '@tanstack/react-table'
import IconsRow from '~/components/IconsRow'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { capitalizeFirstLetter, chainIconUrl, formattedNum, tokenIconUrl } from '~/utils'
import { Name } from '../../shared'
import type { INftsCollectionRow } from '../types'

export const chainsColumns: ColumnDef<INftsCollectionRow>[] = [
	{
		header: 'Name',
		accessorKey: 'chain',
		enableSorting: false,
		cell: ({ row }) => {
			const item = row.original

			return (
				<Name>
					<TokenLogo logo={chainIconUrl(item.chain)} />
					<CustomLink
						style={{
							marginLeft: '16px',
							whiteSpace: 'nowrap',
							minWidth: '200px'
						}}
						href={'/nfts/chain/' + item.chain}
					>
						{capitalizeFirstLetter(item.chain)}
					</CustomLink>
				</Name>
			)
		},
		size: 200
	},
	{
		header: 'MarketPlaces',
		accessorKey: 'marketplaces',
		enableSorting: false,
		cell: (info) => {
			const values = info.getValue() as Array<string>
			return <IconsRow links={values.map((x) => capitalizeFirstLetter(x))} url="/nfts/marketplace" iconType="token" />
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Collections',
		accessorKey: 'collections',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <>{getValue() <= 0 ? '--' : formattedNum(getValue(), false)}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Daily Volume',
		accessorKey: 'dailyVolumeUSD',
		enableSorting: true,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Total Volume',
		accessorKey: 'totalVolumeUSD',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <>{getValue() <= 0 ? '--' : formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	}
]
export const marketplacesColumns: ColumnDef<INftsCollectionRow>[] = [
	{
		header: 'Name',
		accessorKey: 'marketplace',
		enableSorting: false,
		cell: ({ row }) => {
			const item = row.original
			return (
				<Name>
					<TokenLogo logo={tokenIconUrl(item.marketplace)} />
					<CustomLink
						style={{
							marginLeft: '16px',
							whiteSpace: 'nowrap',
							minWidth: '200px'
						}}
						href={'/nfts/marketplace/' + item.slug}
					>
						{capitalizeFirstLetter(item.marketplace)}
					</CustomLink>
				</Name>
			)
		},
		size: 200
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: (info) => {
			const values = info.getValue() as Array<string>
			return <IconsRow links={values.map((x) => capitalizeFirstLetter(x))} url="/nfts/chain" iconType="chain" />
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Collections',
		accessorKey: 'collections',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <>{getValue() <= 0 ? '--' : formattedNum(getValue(), false)}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Daily Volume',
		accessorKey: 'dailyVolumeUSD',
		enableSorting: true,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Total Volume',
		accessorKey: 'totalVolumeUSD',
		enableSorting: true,
		cell: ({ getValue }) => {
			return <>{getValue() <= 0 ? '--' : formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	}
]
