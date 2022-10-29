import { useState } from 'react'
import { FixedSizeList as List } from 'react-window'

import { Input } from './TokenInput'
import styled from 'styled-components'
import { TYPE } from '~/Theme'
import { CloseBtn } from '.'

interface Props {
	tokens: Array<{ symbol: string; address: string }>
	setTokens: (
		obj: Record<'token0' | 'token1', { address: string; logoURI: string; symbol: string; decimals: string }>
	) => void
	onClick: () => void
}

const ModalWrapper = styled.div`
	display: flex;
	flex-direction: column;
	min-width: 540px;
	height: 500px;
	background: ${({ theme }) => theme.bg1};
	left: -5%;

	box-shadow: ${({ theme }) =>
		theme.mode === 'dark'
			? '10px 0px 50px 10px rgba(26, 26, 26, 0.9);'
			: '10px 0px 50px 10px rgba(211, 211, 211, 0.9);;'};
	padding: 16px;
	border-radius: 16px;
	position: absolute;
	z-index: 2;

	animation: scale-in-center 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;

	@keyframes scale-in-center {
		0% {
			transform: scale(0);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
`

const Header = styled.div`
	position: sticky;
	text-align: center;
	justify-content: center;
	display: flex;
	margin-bottom: 8px;
`

const PairRow = styled.div`
	display: flex;
	grid-row-gap: 8px;
	margin-top: 16px;
	border-bottom: ${({ theme }) => (theme.mode === 'dark' ? '1px solid #373944;' : '2px solid #c6cae0;')};
	padding: 8px;
	cursor: pointer;

	&:hover {
		background-color: rgba(246, 246, 246, 0.1);
	}
`

const IconImage = styled.img`
	border-radius: 50%;
	width: 20px;
	height: 20px;
`
const IconWrapper = styled.div`
	display: flex;
	margin-right: 8px;
`

const Pairs = styled.div`
	overflow-y: scroll;
`

const Row = ({ data: { data, onClick }, index, style }) => {
	const pair = data[index]

	return (
		<PairRow key={pair.value} style={style} onClick={() => onClick(pair)}>
			<IconWrapper>
				<IconImage src={pair.token0.logoURI} /> - <IconImage src={pair.token1.logoURI} />
			</IconWrapper>
			<TYPE.heading>{pair.label}</TYPE.heading>
		</PairRow>
	)
}
const Modal = ({ close, onInputChange, data, onClick }) => {
	return (
		<ModalWrapper>
			<Header>
				<TYPE.largeHeader fontSize={20}>Search</TYPE.largeHeader>
				<CloseBtn onClick={close} />
			</Header>
			<div>
				<Input placeholder="Search... (BTC-ETH)" onChange={onInputChange} />
			</div>
			<List height={390} itemCount={data.length} itemSize={38} itemData={{ data, onClick }}>
				{Row}
			</List>
			<Pairs></Pairs>
		</ModalWrapper>
	)
}

export default function Search({ tokens, setTokens, onClick }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	const toggle = () => setIsOpen((open) => !open)

	const [data, setData] = useState([])

	const onRowClick = (pair) => {
		setTokens(pair)
		setIsOpen(false)
		setData([])
	}

	const onChange = ({ target: { value } }) => {
		const [symbol0, symbol1] = value.split(/-| | \//)
		if (symbol0?.length < 2) {
			setData([])
			return
		}
		const tokens0 = tokens.filter(({ symbol }) => symbol.toLowerCase().includes(symbol0))

		const tokens1 = (() => {
			if (tokens0.length > 100 || !symbol1) return tokens.slice(0, 100)
			else return tokens.filter(({ symbol }) => symbol.toLowerCase().includes(symbol1))
		})()

		const data = tokens0.reduce(
			(acc, token0) =>
				acc.concat(
					tokens1.map((token1) => ({
						token1,
						token0,
						label: `${token0.symbol}-${token1.symbol}`,
						value: `${token0.address}-${token1.address}`
					}))
				),
			[]
		)

		setData(data)
	}

	return (
		<>
			<Input
				placeholder="Search... (BTC-ETH)"
				disabled
				onClick={() => {
					toggle()
					onClick()
				}}
			/>
			{isOpen ? (
				<Modal onClick={onRowClick} close={() => setIsOpen(false)} onInputChange={onChange} data={data} />
			) : null}
		</>
	)
}
