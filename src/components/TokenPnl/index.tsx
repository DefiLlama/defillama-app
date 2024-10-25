import { useQuery } from '@tanstack/react-query'
import React, { useMemo, useState, useRef, useCallback } from 'react'
import { IResponseCGMarketsAPI } from '~/api/types'
import { useRouter } from 'next/router'
import LocalLoader from '../LocalLoader'
import styled, { css } from 'styled-components'
import { CoinsPicker } from '../Correlations'
import { formattedNum } from '~/utils'
import { Icon } from '~/components/Icon'

const unixToDateString = (unixTimestamp) => {
	if (!unixTimestamp) return ''
	const date = new Date(unixTimestamp * 1000)
	return date.toISOString().split('T')[0]
}

const dateStringToUnix = (dateString) => {
	if (!dateString) return ''
	return Math.floor(new Date(dateString).getTime() / 1000)
}

const DatePicker = ({ value, onChange, max, min, onClose }) => {
	const hiddenInputRef = useRef(null)

	const handleClick = () => {
		hiddenInputRef.current.showPicker()
	}

	const handleChange = (e) => {
		const newDate = e.target.value
		if (newDate !== value) {
			onChange({ target: { value: newDate } })
			onClose()
		}
	}

	return (
		<DateInputWrapper onClick={handleClick}>
			<DateInputDisplay type="text" value={value} readOnly placeholder="Select a date" />
			<HiddenDateInput ref={hiddenInputRef} type="date" value={value} onChange={handleChange} max={max} min={min} />
		</DateInputWrapper>
	)
}

export default function TokenPnl({ coinsData }) {
	const router = useRouter()
	const now = Math.floor(Date.now() / 1000) - 1000

	const [isModalOpen, setModalOpen] = useState(0)
	const [start, setstart] = useState(now - 7 * 24 * 60 * 60)
	const [end, setend] = useState(now)

	const { selectedCoins, coins } = useMemo(() => {
		const queryCoins = router.query?.coin || (['bitcoin'] as Array<string>)
		const coins = Array.isArray(queryCoins) ? queryCoins : [queryCoins]

		return {
			selectedCoins:
				(queryCoins && coins.map((coin) => coinsData.find((c) => c.id === coin))) || ([] as IResponseCGMarketsAPI[]),
			coins
		}
	}, [router.query, coinsData])

	const id = useMemo(() => {
		return coins.length > 0 ? coins[0] : ''
	}, [coins])

	const fetchPnlData = useCallback(async () => {
		if (!id) return null
		const key = `coingecko:${id}`
		const spanInDays = Math.ceil((end - start) / (24 * 60 * 60))
		const chartRes = await fetch(
			`https://coins.llama.fi/chart/${key}?start=${start}&span=${spanInDays}&searchWidth=600`
		).then((r) => r.json())

		const selectedCoin = coinsData.find((coin) => coin.id === id)

		if (!chartRes.coins[key] || chartRes.coins[key].prices.length < 2) {
			return {
				pnl: 'No data',
				coinInfo: selectedCoin,
				startPrice: null,
				endPrice: null
			}
		}

		const prices = chartRes.coins[key].prices
		const startPrice = prices[0].price
		const endPrice = prices[prices.length - 1].price
		const pnlValue = ((endPrice - startPrice) / startPrice) * 100

		return {
			pnl: `${pnlValue.toFixed(2)}%`,
			coinInfo: selectedCoin,
			startPrice,
			endPrice
		}
	}, [id, start, end, coinsData])

	const {
		data: pnlData,
		isLoading,
		isError,
		error,
		refetch
	} = useQuery({
		queryKey: ['pnlData', id, start, end],
		queryFn: fetchPnlData,
		enabled: !!id,
		refetchOnWindowFocus: false
	})

	const updateDateAndFetchPnl = (newDate, isStart) => {
		const unixTimestamp = dateStringToUnix(newDate)
		if (unixTimestamp !== '') {
			if (isStart) {
				setstart(unixTimestamp)
			} else {
				setend(unixTimestamp)
			}
			router.push(
				{
					pathname: router.pathname,
					query: {
						...router.query,
						[isStart ? 'start' : 'end']: unixTimestamp
					}
				},
				undefined,
				{ shallow: true }
			)
			refetch()
		}
	}

	const handleDatePickerClose = () => {
		refetch()
	}

	return (
		<PageWrapper>
			<h1 className="text-2xl font-medium text-center -mb-5">Token Holder Profit and Loss</h1>
			<ContentWrapper>
				<SelectWrapper>
					<TableFilters>
						<Label>Start Date:</Label>
						<DatePicker
							value={unixToDateString(start)}
							onChange={(e) => updateDateAndFetchPnl(e.target.value, true)}
							onClose={handleDatePickerClose}
							min={unixToDateString(0)}
							max={unixToDateString(now)}
						/>
					</TableFilters>

					<TableFilters>
						<Label>End Date:</Label>
						<DatePicker
							value={unixToDateString(end)}
							onChange={(e) => updateDateAndFetchPnl(e.target.value, false)}
							onClose={handleDatePickerClose}
							min={unixToDateString(start)}
							max={new Date().toISOString().split('T')[0]}
						/>
					</TableFilters>

					<TableFilters>
						<Label>Token:</Label>
						<SearchWrapper>
							{selectedCoins[0] ? (
								<SelectedToken onClick={() => setModalOpen(1)}>
									<img
										src={selectedCoins[0].image}
										alt={selectedCoins[0].name}
										width={24}
										height={24}
										style={{ borderRadius: '50%' }}
									/>
									<span>{selectedCoins[0].name}</span>
								</SelectedToken>
							) : (
								<>
									<StyledSearchIcon name="search" height={16} width={16} />
									<SearchInput onClick={() => setModalOpen(1)} placeholder="Search coins..." readOnly />
								</>
							)}
						</SearchWrapper>
					</TableFilters>
				</SelectWrapper>

				<FixedWidthWrapper>
					{coins.length === 1 && (
						<ResultWrapper>
							{isLoading ? (
								<LocalLoader />
							) : isError ? (
								<ErrorContent>
									<ErrorTitle>Error</ErrorTitle>
									<ErrorMessage>{error instanceof Error ? error.message : 'An error occurred'}</ErrorMessage>
									<RetryButton onClick={() => refetch()}>Retry</RetryButton>
								</ErrorContent>
							) : (
								pnlData && (
									<ResultContent>
										<ResultTitle color={parseFloat(pnlData.pnl) >= 0 ? 'green' : 'red'}>
											{parseFloat(pnlData.pnl) >= 0 ? 'Profit' : 'Loss'}
										</ResultTitle>
										<PnlValue color={parseFloat(pnlData.pnl) >= 0 ? 'green' : 'red'}>{pnlData.pnl}</PnlValue>
										{pnlData.coinInfo && (
											<CoinInfo>
												<InfoItem>
													<InfoLabel>Start Price:</InfoLabel>
													<InfoValue>{pnlData.startPrice ? `$${formattedNum(pnlData.startPrice)}` : 'N/A'}</InfoValue>
												</InfoItem>
												<InfoItem>
													<InfoLabel>End Price:</InfoLabel>
													<InfoValue>{pnlData.endPrice ? `$${formattedNum(pnlData.endPrice)}` : 'N/A'}</InfoValue>
												</InfoItem>
												<InfoItem>
													<InfoLabel>Current Price:</InfoLabel>
													<InfoValue>${formattedNum(pnlData.coinInfo.current_price)}</InfoValue>
												</InfoItem>

												<InfoItem>
													<InfoLabel>24h Change:</InfoLabel>
													<InfoValue color={pnlData.coinInfo.price_change_percentage_24h >= 0 ? 'green' : 'red'}>
														{pnlData.coinInfo.price_change_percentage_24h.toFixed(2)}%
													</InfoValue>
												</InfoItem>
												<InfoItem>
													<InfoLabel>All-Time High:</InfoLabel>
													<InfoValue>${formattedNum(pnlData.coinInfo.ath)}</InfoValue>
												</InfoItem>
											</CoinInfo>
										)}
									</ResultContent>
								)
							)}
						</ResultWrapper>
					)}
				</FixedWidthWrapper>

				<CoinsPicker
					coinsData={coinsData}
					isModalOpen={isModalOpen}
					setModalOpen={setModalOpen}
					selectedCoins={{}}
					queryCoins={coins}
					selectCoin={(coin) => {
						const newCoins = coins.slice()
						newCoins[isModalOpen - 1] = coin.id
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
						refetch()
						setModalOpen(0)
					}}
				/>
			</ContentWrapper>
		</PageWrapper>
	)
}

const inputStyles = css`
	width: 100%;
	padding: 12px;
	border: 1px solid ${({ theme }) => theme.bg3};
	border-radius: 8px;
	background-color: ${({ theme }) => theme.bg7};
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
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 1.5rem;
	width: 100%;
`

const TableFilters = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
`

const PageWrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 2rem;
	max-width: 1200px;
	margin: 0 auto;
	gap: 2rem;
`

const ContentWrapper = styled.div`
	min-width: 350px;
	background: ${({ theme }) => theme.bg1};
	border-radius: 12px;
	padding: 2rem;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`

const ResultWrapper = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	height: 100%;
	margin-top: 0.5rem;
	background: ${({ theme }) => theme.bg1};
	border-radius: 8px;
	padding: 1.5rem;
`

const ResultContent = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	width: 100%;
`

const ResultTitle = styled.h2<{ color: string }>`
	font-size: 1.5rem;
	font-weight: bold;
	color: ${({ color }) => color};
`

const PnlValue = styled.span<{ color: string }>`
	font-size: 2rem;
	font-weight: bold;
	margin-bottom: 1rem;
	color: ${({ color }) => color};
`

const CoinInfo = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 1rem;
	width: 100%;
`

const InfoItem = styled.div`
	display: flex;
	flex-direction: column;
`

const InfoLabel = styled.span`
	font-size: 0.9rem;
	color: ${({ theme }) => theme.text2};
`

const InfoValue = styled.span<{ color?: string }>`
	font-size: 1.1rem;
	font-weight: 600;
	color: ${({ color, theme }) => color || theme.text1};
`

const SearchWrapper = styled.div`
	position: relative;
	width: 100%;
`

const SearchInput = styled.input`
	${inputStyles}
	padding-left: 2.5rem;
	cursor: pointer;
`

const StyledSearchIcon = styled(Icon)`
	position: absolute;
	left: 1rem;
	top: 50%;
	transform: translateY(-50%);
	color: ${({ theme }) => theme.text2};
`

const SelectedToken = styled.div`
	${inputStyles}
	display: flex;
	align-items: center;
	cursor: pointer;
	padding: 8px 12px;

	img {
		margin-right: 8px;
	}

	span {
		font-weight: 500;
	}
`

const FixedWidthWrapper = styled.div`
	width: 100%;
	min-height: 200px;
`

const ErrorContent = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
`

const ErrorTitle = styled.h2`
	font-size: 1.5rem;
	font-weight: bold;
	color: ${({ theme }) => theme.red1};
	margin-bottom: 1rem;
`

const ErrorMessage = styled.p`
	font-size: 1rem;
	color: ${({ theme }) => theme.text1};
	text-align: center;
	margin-bottom: 1rem;
`

const RetryButton = styled.button`
	background-color: ${({ theme }) => theme.primary1};
	color: white;
	border: none;
	border-radius: 8px;
	padding: 0.5rem 1rem;
	font-size: 1rem;
	cursor: pointer;
	transition: background-color 0.2s;

	&:hover {
		background-color: ${({ theme }) => theme.primary2};
	}
`
