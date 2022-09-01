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
		accessor: 'name',
		header: 'Name',
		disableSortBy: true,
		Cell: (props: CellProps) => {
			const stackBy = useStackBy()
			if (stackBy === 'protocols') {
				return <ProtocolNameCell {...props} />
			} else {
				return <ChainNameCell {...props} />
			}
		}
	},
	// {
	// 	accessor: 'positionsCount',
	// 	header: 'Open Positions',
	// 	helperText:
	// 		'Number of open positions on lending protocols that are liquidatable, meaning that the deposits are used as collateral to borrow assets.'
	// },
	{
		accessor: 'changes24h',
		header: '24h Change',
		helperText: 'Liquidatable amount change in the last 24 hours.',
		Cell: ({ value }: CellProps) => {
			const isNegative = value < 0
			const isZero = value === 0
			const isSmol = Math.abs(value as number) < 0.01

			if (isZero || !value) {
				return <span>-</span>
			}

			if (isSmol) {
				return (
					<span style={{ color: isNegative ? '#F56565' : '#48BB78' }}>
						{'<'}
						{isNegative ? '-' : '+'}
						{'0.01%'}
					</span>
				)
			}

			const _value = (value as number).toFixed(2)
			return (
				<span style={{ color: isNegative ? '#F56565' : '#48BB78' }}>
					{isNegative ? '' : '+'}
					{_value}%
				</span>
			)
		}
	},
	{
		accessor: 'liquidableAmount',
		header: 'Liquidatable Amount',
		helperText: 'Total amount of liquidatable assets.',
		Cell: ({ value }: CellProps) => {
			const _value = getReadableValue(value as number)
			return <span>${_value}</span>
		}
	},
	{
		accessor: 'dangerousAmount',
		header: 'Amount within -20%',
		helperText: 'Amount of liquidable positions that are within -20% of liquidation price.',
		Cell: ({ value }: CellProps) => {
			const _value = getReadableValue(value as number)
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

export const ProtocolsTable = (props: { data: ChartData; prevData: ChartData }) => {
	const stackBy = useStackBy()

	const rowsSorted = useMemo(() => {
		const rows: RowValues[] = Object.keys(props.data.totalLiquidables[stackBy]).map((name) => {
			const current = props.data.totalLiquidables[stackBy][name]
			const prev = props.prevData.totalLiquidables[stackBy][name]
			const changes24h = ((current - prev) / prev) * 100
			const liquidableAmount = current
			const dangerousAmount = props.data.dangerousPositionsAmounts[stackBy][name]
			// const positionsCount = props.data.positionsCount[stackBy][name]
			return {
				name,
				changes24h,
				liquidableAmount,
				dangerousAmount
				// positionsCount
			}
		})

		return rows.sort((a, b) => {
			return b.liquidableAmount - a.liquidableAmount
		})
	}, [props.data.totalLiquidables, props.prevData.totalLiquidables, props.data.dangerousPositionsAmounts, stackBy])

	return <TableStyled columns={COLUMNS} data={rowsSorted} gap={'8px'} />
}

type RowValues = {
	name: string
	// positionsCount: number
	changes24h: number
	liquidableAmount: number
	dangerousAmount: number
}

type CellProps = {
	rowIndex: number
	rowValues: RowValues
	value: number | string
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
