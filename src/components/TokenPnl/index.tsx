import { TYPE } from '~/Theme'
import React, { useMemo, useState, useRef } from 'react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { useRouter } from 'next/router'
import LocalLoader from '../LocalLoader'
import styled, { css } from 'styled-components'
import { SearchIcon } from '~/containers/Hacks'
import { CoinsPicker } from '../Correlations'

const unixToDateString = (unixTimestamp) => {
	if (!unixTimestamp) return ''
	const date = new Date(unixTimestamp * 1000)
	return date.toISOString().split('T')[0]
}

const dateStringToUnix = (dateString) => {
	if (!dateString) return ''
	return Math.floor(new Date(dateString).getTime() / 1000)
}

const DatePicker = ({ value, onChange, max, min }) => {
	const hiddenInputRef = useRef(null)

	const handleClick = () => {
		hiddenInputRef.current.showPicker()
	}

	return (
		<DateInputWrapper onClick={handleClick}>
			<DateInputDisplay type="text" value={value} readOnly placeholder="Select a date" />
			<HiddenDateInput ref={hiddenInputRef} type="date" value={value} onChange={onChange} max={max} min={min} />
		</DateInputWrapper>
	)
}

export default function TokenPnl({ coinsData }) {
	const router = useRouter()
	const now = Math.floor(Date.now() / 1000) - 1000

	const [isModalOpen, setModalOpen] = useState(0)
	const [start, setstart] = useState(now - 24 * 60 * 60)
	const [end, setend] = useState(now)
	const [id, setId] = useState('bitcoin')
	const [pnlData, setPnlData] = useState('')

	const { selectedCoins, coins } = useMemo(() => {
		const queryCoins = router.query?.coin || ([] as Array<string>)
		const coins = Array.isArray(queryCoins) ? queryCoins : [queryCoins]

		return {
			selectedCoins:
				(queryCoins && coins.map((coin) => coinsData.find((c) => c.id === coin))) || ([] as IResponseCGMarketsAPI[]),
			coins
		}
	}, [router.query])

	const fetchPnlData = async () => {
		const key = `coingecko:${id}`
		const res = await fetch(
			`https://coins.llama.fi/percentage/${key}?timestamp=${start}&lookForward=true&period=${end - start}`
		).then((r) => r.json())
		setPnlData(res.coins[key] ? `${res.coins[key].toFixed(2)}%` : `No data for this token and timeframe`)
	}

	fetchPnlData()

	return (
		<>
			<TYPE.largeHeader style={{ marginTop: '8px' }}>Token Holder Profit and Loss</TYPE.largeHeader>
			<Wrapper>
				<SelectWrapper>
					<TableFilters>
						<Label>Start Date:</Label>
						<DatePicker
							value={unixToDateString(start)}
							onChange={(e) => {
								setPnlData(null)
								const dateString = e.target.value
								const unixTimestamp = dateStringToUnix(dateString)
								if (unixTimestamp != '') setstart(unixTimestamp)
								fetchPnlData()
								router.push(
									{
										pathname: router.pathname,
										query: {
											...router.query,
											start: unixTimestamp
										}
									},
									undefined,
									{ shallow: true }
								)
							}}
							min={unixToDateString(0)}
							max={unixToDateString(now)}
						/>
					</TableFilters>

					<TableFilters>
						<Label>End Date:</Label>
						<DatePicker
							value={unixToDateString(end)}
							onChange={(e) => {
								setPnlData(null)
								const dateString = e.target.value
								const unixTimestamp = dateStringToUnix(dateString)
								if (unixTimestamp != '') setend(unixTimestamp)
								fetchPnlData()
								router.push(
									{
										pathname: router.pathname,
										query: {
											...router.query,
											end: unixTimestamp
										}
									},
									undefined,
									{ shallow: true }
								)
							}}
							min={unixToDateString(start)}
							max={new Date().toISOString().split('T')[0]}
						/>
					</TableFilters>

					<TableFilters>
						<Label>Token:</Label>
						<SearchIcon size={16} />
						<input value={selectedCoins[0]?.name} onClick={() => setModalOpen(1)} placeholder="Search coins..." />
					</TableFilters>
				</SelectWrapper>
				{coins.length === 1 ? (
					pnlData == null ? (
						<LocalLoader />
					) : (
						<Wrapper2>{<TYPE.largeHeader>{pnlData}</TYPE.largeHeader>}</Wrapper2>
					)
				) : null}

				<CoinsPicker
					coinsData={coinsData}
					isModalOpen={isModalOpen}
					setModalOpen={setModalOpen}
					selectedCoins={{}}
					queryCoins={coins}
					selectCoin={(coin) => {
						setPnlData(null)
						const newCoins = coins.slice()
						newCoins[isModalOpen - 1] = coin.id
						setId(coin.id)
						router.push(
							{
								pathname: router.pathname,
								query: {
									...router.query,
									coin: newCoins
								}
							},
							undefined,
							{ shallow: true }
						)
						fetchPnlData()
						setModalOpen(0)
					}}
				/>
			</Wrapper>
		</>
	)
}

const inputStyles = css`
	width: 100%;
	padding: 12px;
	border: 1px solid ${({ theme }) => theme.bg3};
	border-radius: 8px;
	background-color: ${({ theme }) => theme.bg2};
	color: ${({ theme }) => theme.text1};
	font-size: 16px;
	transition: all 0.3s ease;

	&:focus {
		outline: none;
		border-color: ${({ theme }) => theme.primary1};
		box-shadow: 0 0 0 2px ${({ theme }) => theme.primary1}33;
	}
`

const DateInputDisplay = styled.input`
	${inputStyles}
	cursor: pointer;
`

const DateInputWrapper = styled.div`
	position: relative;
	width: 100%;
`

const HiddenDateInput = styled.input`
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	opacity: 0;
	cursor: pointer;
`

const Label = styled.label`
	display: block;
	margin-bottom: 8px;
	color: ${({ theme }) => theme.text2};
	font-weight: 600;
`

const SelectWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;

	& > span {
		min-width: min(90vw, 300px);
		width: 100%;
		white-space: nowrap;
	}

	@media (min-width: ${({ theme }) => theme.bpMed}) {
		flex-direction: row;
		gap: 36px;
	}
`

const TableFilters = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	position: relative;

	input {
		width: 100%;
		margin-right: auto;
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};

		font-size: 0.875rem;
		border: none;
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		input {
			max-width: 400px;
		}
	}
`

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 80px;
`

const Wrapper2 = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
`
