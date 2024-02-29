import dayjs from 'dayjs'
import { sum } from 'lodash'
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import TokenLogo from '~/components/TokenLogo'
import { formattedNum, tokenIconUrl } from '~/utils'

const Wrapper = styled.div`
	display: flex;
	justify-content: space-between;
	background-color: ${({ theme }) => theme.bg1};
	padding: 16px;
	border-radius: 10px;
	width: 390px;
`

const Column = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
	padding: 0 8px;
`
const Row = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`

const Time = styled.div`
	display: flex;
	gap: 4px;
	align-items: center;
`

const TimeBox = styled.div`
	background-color: ${({ theme }) => theme.bg4};
	border-radius: 8px;
	width: 40px;
	height: 40px;
	text-align: center;
	vertical-align: middle;
	line-height: 40px;
`

const LigthText = styled.span`
	color: ${({ theme }) => theme.text3};
`

const TooltipBody = styled.div`
	position: absolute;
	z-index: 1;
	top: 90px;
	width: 380px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: ${({ theme }) => theme.bg1};
	padding: 8px;
	border-radius: 10px;
	border: 1px solid ${({ theme }) => theme.bg4};
`

const HorizontalLine = styled.div`
	width: 100%;
	height: 1px;
	background-color: ${({ theme }) => theme.bg4};
`

const UpcomingEvent = ({ noOfTokens = [], timestamp, description, price, symbol, mcap, maxSupply, row }) => {
	const tokenPrice = row?.tokenPrice?.[0]
	const tokenSymbol = tokenPrice?.symbol?.toUpperCase() || symbol?.toUpperCase() || row?.name
	const tokens = noOfTokens.reduce((acc, curr) => (acc += curr.length === 2 ? curr[1] - curr[0] : curr[0]), 0)
	const tokenValue = price ? tokens * price : null
	const unlockPercent = maxSupply ? (tokens / maxSupply) * 100 : null
	const unlockPercentFloat = tokenValue && mcap ? (tokenValue / mcap) * 100 : null

	const timeLeft = timestamp - Date.now() / 1e3
	const days = Math.floor(timeLeft / 86400)
	const hours = Math.floor((timeLeft - 86400 * days) / 3600)
	const minutes = Math.floor((timeLeft - 86400 * days - 3600 * hours) / 60)
	const seconds = Math.floor(timeLeft - 86400 * days - 3600 * hours - minutes * 60)
	const [_, rerender] = useState(1)
	const [isTooltipOpen, setIsTooltipOpen] = useState(false)
	const currentUnlockBreakdown = row.upcomingEvent.map(({ description, noOfTokens, timestamp }) => {
		const regex =
			/of (.+?) tokens will be unlocked|will increase from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp}|from (.+?) on {timestamp}/
		const match = description?.match(regex)
		const name = match?.[1] || match?.[2] || match?.[3] || ''
		const amount = sum(noOfTokens)
		return {
			name,
			amount,
			timestamp
		}
	})

	useEffect(() => {
		const id = setInterval(() => rerender((value) => value + 1), 1000)

		return () => clearInterval(id)
	}, [])

	return (
		<>
			<Wrapper onMouseEnter={() => setIsTooltipOpen(true)} onMouseLeave={() => setIsTooltipOpen(false)}>
				<Column>
					{tokenValue ? formattedNum(tokenValue, true) : '-'}
					{unlockPercent ? (
						<LigthText>
							{formattedNum(unlockPercent)}%{' '}
							{unlockPercentFloat ? <>({formattedNum(unlockPercentFloat)}% of float)</> : null}
						</LigthText>
					) : null}
				</Column>
				<Column>
					<Time>
						<TimeBox>{days}D</TimeBox>
						<TimeBox>{hours}H</TimeBox>
						<TimeBox>{minutes}M</TimeBox>
						<TimeBox>{seconds}S</TimeBox>
					</Time>
				</Column>
			</Wrapper>
			{isTooltipOpen ? (
				<TooltipBody>
					<Column>
						<Row>
							<Column>
								<Row style={{ justifyContent: 'start', gap: '8px' }}>
									<TokenLogo logo={tokenIconUrl(row.name)} size={30} />
									{tokenSymbol}
								</Row>
							</Column>
							{timestamp ? dayjs(timestamp * 1e3).format('MMM D, YYYY') : null}
						</Row>
						<HorizontalLine />
						{currentUnlockBreakdown.map(({ name, amount }) => {
							const percentage = (amount / maxSupply) * 100
							const percentageFloat = tokenValue && mcap ? (amount / mcap) * 100 : null
							const usdValue = price ? amount * price : null
							return (
								<Row key={name + amount}>
									<Column>
										{name}
										<LigthText>
											{formattedNum(percentage)}%{' '}
											{unlockPercentFloat ? <>({formattedNum(unlockPercentFloat)}% of float)</> : null}
										</LigthText>
									</Column>
									<Column style={{ alignItems: 'end' }}>
										{usdValue ? formattedNum(usdValue, true) : '-'}
										<LigthText>
											{formattedNum(amount)} {tokenSymbol}
										</LigthText>
									</Column>
								</Row>
							)
						})}
					</Column>
				</TooltipBody>
			) : null}
		</>
	)
}

export default UpcomingEvent
