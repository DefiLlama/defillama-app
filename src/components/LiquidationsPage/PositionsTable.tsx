import { ChartData, getReadableValue } from '~/utils/liquidations'
import React, { useMemo } from 'react'
import styled from 'styled-components'
import Table from '../Table'
import { IColumnProps } from '../Table/types'
import { useStackBy } from './utils'
import useSWR from 'swr'
import { fetcher } from '~/utils/useSWR'
import { CHAINS_API, CONFIG_API } from '~/constants'
import { chainIconUrl } from '~/utils'
import TokenLogo from '../TokenLogo'
import Link from 'next/link'

const ProtocolNameCell = ({ value }: CellProps) => {
	let _value: string
	// alue === 'traderjoe' ? 'trader-joe' : value
	switch (value) {
		case 'traderjoe':
			_value = 'trader-joe'
			break
		case 'maker':
			_value = 'makerdao'
			break
		default:
			_value = value as string
	}

	const { data } = useSWR<ProtocolSmolPartial>(`${CONFIG_API}/smol/${_value}`, fetcher)

	if (!data) return <span>{_value}</span>
	return (
		<Link href={`/protocol/${_value}`} passHref>
			<a>
				<NameCellWrapper>
					<TokenLogo logo={data.logo} />
					<span>{data.name}</span>
				</NameCellWrapper>
			</a>
		</Link>
	)
}

const ChainNameCell = ({ value }: CellProps) => {
	const { data } = useSWR<ChainPartial[]>(`${CHAINS_API}`, fetcher)
	if (!data) return <span>{value}</span>
	const { name } = data.find((chain) => chain.name.toLowerCase() === (value as string).toLowerCase()) || {}
	return (
		<Link href={`/chain/${name}`} passHref>
			<a>
				<NameCellWrapper>
					<TokenLogo logo={chainIconUrl(name)} />
					<span>{name}</span>
				</NameCellWrapper>
			</a>
		</Link>
	)
}

const NameCellWrapper = styled.div`
	display: flex;
	align-items: center;
	flex-direction: row;
	gap: 0.5rem;
`

const COLUMNS: IColumnProps[] = [
	{
		accessor: 'protocolName',
		header: 'Protocol',
		disableSortBy: true,
		Cell: (props: CellProps) => {
			return <ProtocolNameCell {...props} />
		}
	},
	{
		accessor: 'chainName',
		header: 'Chain',
		disableSortBy: true,
		Cell: (props: CellProps) => {
			return <ChainNameCell {...props} />
		}
	},
	{
		accessor: 'owner',
		header: 'Owner',
		disableSortBy: true,
		Cell: ({ value }: CellProps) => {
			if (typeof value !== 'object') {
				return <span>{value}</span>
			}
			// cut middle, leave only first 6 and last 4 letters
			return (
				<a href={value.url} target="_blank" rel="noopener noreferrer">
					{value.displayName.length > 13
						? `${value.displayName.substring(0, 6)}...${value.displayName.substring(value.displayName.length - 4)}`
						: value.displayName}
				</a>
			)
		}
	},
	{
		accessor: 'value',
		header: 'Value in USD',
		Cell: ({ value }: CellProps) => {
			const _value = (value as number).toLocaleString()
			return <span>${_value}</span>
		}
	},
	{
		accessor: 'amount',
		header: 'Token Amount',
		Cell: ({ value }: CellProps) => {
			const _value = (value as number).toLocaleString()
			return <span>{_value}</span>
		}
	},
	{
		accessor: 'liqPrice',
		header: 'Liquidation Price',
		helperText: 'Liquidation price in USD.',
		Cell: ({ value }: CellProps) => {
			const _value = (value as number).toLocaleString()
			return <span>${_value}</span>
		}
	}
]

const TableStyled = styled(Table)`
	tr > *:not(:first-child) {
		& > * {
			width: 11rem;
			white-space: nowrap;
			overflow: hidden;
			font-weight: 400;
			margin-left: auto;
		}
	}

	// ASSET NAME
	tr > *:nth-child(1) {
		& > * {
			/* width: 20px; */
			overflow: hidden;
			white-space: nowrap;

			/* // HIDE LOGO
			& > *:nth-child(1) {
				display: none;
			} */
		}
	}

	// 1D CHANGE
	tr > *:nth-child(2) {
		display: none;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		// 1D CHANGE
		tr > *:nth-child(2) {
			display: revert;
		}
	}

	// LIQUIABLE AMOUNT
	tr > *:nth-child(3) {
		margin-left: -1rem;
		padding-right: 1rem;
	}

	// DANGEROUS AMOUNT
	tr > *:nth-child(4) {
		display: none;
	}

	@media screen and (min-width: 900px) {
		// DANGEROUS AMOUNT
		tr > *:nth-child(4) {
			display: revert;
		}
	}
`

export const PositionsTable = (props: { data: ChartData; prevData: ChartData }) => {
	const rows = props.data.topPositions.map((p) => ({
		chainName: p.chain,
		protocolName: p.protocol,
		value: p.collateralValue,
		amount: p.collateralAmount,
		liqPrice: p.liqPrice,
		owner: {
			displayName: p.displayName,
			url: p.url
		}
	})) as RowValues[]

	return <TableStyled columns={COLUMNS} data={rows} gap={'8px'} />
	// return <pre>{JSON.stringify(rows[0], null, 2)}</pre>
}

type RowValues = {
	chainName: string
	protocolName: string
	value: number
	amount: number
	liqPrice: number
	owner: {
		displayName: string
		url: string
	}
}

type CellProps = {
	rowIndex: number
	rowValues: RowValues
	value:
		| number
		| string
		| {
				displayName: string
				url: string
		  }
}

type ProtocolSmolPartial = {
	name: string
	logo: string
	gecko_id: string
	cmcId: string
	category: string
	chains: string[]
	parentProtocol: string
}

type ChainPartial = {
	gecko_id: string
	tvl: number
	tokenSymbol: string
	cmcId: string
	name: string
	chainId: number
}
