import { ChartData } from '~/utils/liquidations'
import React from 'react'
import styled from 'styled-components'
import Table from '../Table'
import { IColumnProps } from '../Table/types'
import useSWR from 'swr'
import { fetcher } from '~/utils/useSWR'
import { CHAINS_API, CONFIG_API } from '~/constants'
import { chainIconUrl } from '~/utils'
import TokenLogo from '../TokenLogo'
import Link from 'next/link'
import { ExternalLink } from 'react-feather'
import { SmolHints } from '~/pages/liquidations/[symbol]'

const ProtocolNameCell = ({ value }: CellProps) => {
	let _value: string
	switch (value) {
		case 'traderjoe':
			_value = 'trader-joe'
			break
		case 'benqi':
			_value = 'benqi-lending'
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
	let _value = value as string
	if (value === 'bsc') {
		_value = 'binance'
	}
	const { name } = data.find((chain) => chain.name.toLowerCase() === _value.toLowerCase()) || {}
	let _name = name
	if (value === 'bsc') {
		_name = 'BSC'
	}

	return (
		<Link href={`/chain/${_name}`} passHref>
			<a>
				<NameCellWrapper>
					<TokenLogo logo={chainIconUrl(name)} />
					<span>{_name}</span>
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

const LinkCellWrapper = styled.div`
	display: flex;
	align-items: flex-start;
	justify-content: flex-end;
	flex-direction: row;
	gap: 0.2rem;
`

const COLUMNS: IColumnProps[] = [
	{
		accessor: 'protocolName',
		header: 'Protocol',
		// disableSortBy: true,
		Cell: (props: CellProps) => {
			return <ProtocolNameCell {...props} />
		}
	},
	{
		accessor: 'chainName',
		header: 'Chain',
		// disableSortBy: true,
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
					<LinkCellWrapper>
						{value.displayName.length > 13
							? `${value.displayName.substring(0, 6)}...${value.displayName.substring(value.displayName.length - 4)}`
							: value.displayName}
						<ExternalLink size={10} />
					</LinkCellWrapper>
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
			return (
				<span>
					<b>${_value}</b>
				</span>
			)
		}
	}
]

const TableStyled = styled(Table)`
	tr > *:not(:first-child) {
		& > * {
			width: 10rem;
			white-space: nowrap;
			overflow: hidden;
			font-weight: 400;
			margin-left: auto;
		}
	}

	tr > *:nth-child(1) {
		display: none;
		width: 10rem;
		& > * {
			justify-content: flex-start;
			text-align: start;
			overflow: hidden;
			white-space: nowrap;
		}
		& > * > button {
			width: revert;
			justify-content: flex-start;
			overflow: hidden;
			white-space: nowrap;
		}
	}

	@media screen and (min-width: 80rem) {
		tr > *:nth-child(1) {
			display: revert;
		}
	}

	tr > *:nth-child(2) {
		display: none;
		width: 10rem;
		& > * {
			justify-content: flex-start;
			text-align: start;
			overflow: hidden;
			white-space: nowrap;
		}
		& > * > button {
			width: revert;
			justify-content: flex-start;
			overflow: hidden;
			white-space: nowrap;
		}
	}

	@media screen and (min-width: 80rem) {
		tr > *:nth-child(2) {
			display: revert;
		}
	}

	tr > *:nth-child(3) {
		margin-left: -1rem;
		padding-right: 1rem;
	}

	tr > *:nth-child(4) {
		margin-left: -6rem;
		display: none;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpSm}) {
		tr > *:nth-child(4) {
			display: revert;
		}
	}

	tr > *:nth-child(5) {
		display: none;
		margin-left: -1rem;
	}

	@media screen and (min-width: 50rem) {
		tr > *:nth-child(5) {
			display: revert;
		}
	}
`

const TableNoticeWrapper = styled.div`
	margin-bottom: -1rem;
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

	return (
		<>
			<TableNoticeWrapper>
				<SmolHints>
					<i>
						Displaying the largest {rows.length} positions out of {props.data.totalPositions} in total
					</i>
				</SmolHints>
			</TableNoticeWrapper>
			<TableStyled columns={COLUMNS} data={rows} gap={'2px'} />
		</>
	)
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
