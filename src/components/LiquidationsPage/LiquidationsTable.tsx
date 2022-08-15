import { ChartData, getReadableValue } from '~/utils/liquidations'
import React from 'react'
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
	const { data } = useSWR<ProtocolSmolPartial>(`${CONFIG_API}/smol/${value}`, fetcher)

	if (!data) return <span>{value}</span>
	return (
		<Link href={`/protocol/${value}`} passHref>
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
	console.log(data)
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
		helperText: 'Liquidable amount change in the last 24 hours.',
		Cell: ({ value }: CellProps) => {
			const _value = (value as number).toFixed(1)
			const isZero = value === 0
			if (isZero) {
				return <span>{_value}%</span>
			}
			const isNegative = value < 0
			return (
				<span style={{ color: isNegative ? '#F56565' : '#48BB78' }}>
					{isNegative ? '-' : '+'}
					{_value}%
				</span>
			)
		}
	},
	{
		accessor: 'liquidableAmount',
		header: 'Liquidable Amount',
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

export const LiquidationsTable = (props: { data: ChartData; prevData: ChartData }) => {
	const stackBy = useStackBy()

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

	return <Table columns={COLUMNS} data={rows} />
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
