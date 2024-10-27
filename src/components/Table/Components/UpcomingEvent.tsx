import dayjs from 'dayjs'
import { sum } from 'lodash'
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, tokenIconUrl } from '~/utils'

const Wrapper = styled.div<{ isProtocolPage: boolean }>`
	display: flex;
	justify-content: space-between;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? '#121316' : theme.bg1)};
	padding: 8px;
	border-radius: 10px;
	width: 390px;
	${({ isProtocolPage }) => (isProtocolPage ? 'border-radius:10px 10px 0px 0px; ' : '10px')}
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
	margin-top: 6px;
`

const TimeBox = styled.div`
	background-color: ${({ theme }) => theme.bg4};
	border-radius: 8px;
	min-width: 30px;
	height: 30px;
	text-align: center;
	font-size: 14px;
	vertical-align: middle;
	line-height: 30px;
`

const LigthText = styled.span`
	color: ${({ theme }) => theme.text3};
`

const TooltipBody = styled.div<{ isProtocolPage: boolean }>`
	position: absolute;
	z-index: 1;
	top: 70px;
	border-radius: 10px;
	width: 390px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? '#121316' : theme.bg1)};
	padding: 8px;
	border: 1px solid ${({ theme }) => theme.bg4};
	${({ isProtocolPage }) => isProtocolPage && 'border-top: none;'}
	${({ isProtocolPage }) => isProtocolPage && 'border: none; '}
	${({ isProtocolPage }) => isProtocolPage && 'border-radius: 0px 0px 10px 10px; '}
`

const HorizontalLine = styled.div`
	width: 100%;
	height: 1px;
	background-color: ${({ theme }) => theme.bg4};
`

const UpcomingEvent = ({
	noOfTokens = [],
	timestamp,
	event,
	price,
	symbol,
	mcap,
	maxSupply,
	name,
	tooltipStyles = null,
	isProtocolPage = false
}) => {
	const tokenPrice = price
	const tokenSymbol = tokenPrice?.symbol?.toUpperCase() || symbol?.toUpperCase()
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
	const currentUnlockBreakdown = event.map(({ description, noOfTokens, timestamp }) => {
		const regex =
			/(?:of (.+?) tokens (?:will be|were) unlocked)|(?:will (?:increase|decrease) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})|(?:from (.+?) on {timestamp})|(?:was (?:increased|decreased) from \{tokens\[0\]\} to \{tokens\[1]\} tokens per week from (.+?) on {timestamp})/
		const matches = description.match(regex)
		const name = matches?.[1] || matches?.[2] || matches?.[3] || matches?.[4] || ''
		const amount = sum(noOfTokens)
		return {
			name,
			amount,
			timestamp
		}
	})

	useEffect(() => {
		if (timeLeft <= 0) return
		const id = setInterval(() => rerender((value) => value + 1), 1000)

		return () => clearInterval(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<>
			<Wrapper
				onMouseEnter={() => setIsTooltipOpen(true)}
				onMouseLeave={() => setIsTooltipOpen(false)}
				isProtocolPage={isProtocolPage}
			>
				<Column>
					{tokenValue ? (
						formattedNum(tokenValue, true)
					) : (
						<div style={{ marginTop: '16px' }}>{formattedNum(unlockPercent)}%</div>
					)}
					{unlockPercent ? (
						<LigthText>
							{tokenValue ? formattedNum(unlockPercent) + '%' : null}
							{unlockPercentFloat ? <>({formattedNum(unlockPercentFloat)}% of float)</> : null}
						</LigthText>
					) : null}
				</Column>
				<Column>
					{timeLeft > 0 ? (
						<Time>
							<TimeBox>{days}D</TimeBox>
							<TimeBox>{hours}H</TimeBox>
							<TimeBox>{minutes}M</TimeBox>
							<TimeBox>{seconds}S</TimeBox>
						</Time>
					) : (
						<Time style={{ justifyContent: 'flex-end' }}>
							<TimeBox style={{ width: 'fit-content', padding: '0px 8px' }}>{Math.abs(days)} days ago</TimeBox>
						</Time>
					)}
				</Column>
			</Wrapper>
			{isTooltipOpen || tooltipStyles ? (
				<TooltipBody style={tooltipStyles} isProtocolPage={isProtocolPage}>
					<Column>
						{isProtocolPage ? null : (
							<Row>
								<Column>
									<Row style={{ justifyContent: 'start', gap: '8px' }}>
										<TokenLogo logo={tokenIconUrl(name)} size={30} />
										{tokenSymbol}
									</Row>
								</Column>
								{timestamp ? dayjs(timestamp * 1e3).format('MMM D, YYYY') : null}
							</Row>
						)}
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
											{percentageFloat ? <>({formattedNum(percentageFloat)}% of float)</> : null}
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
