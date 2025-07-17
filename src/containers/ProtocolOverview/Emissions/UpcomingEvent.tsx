import dayjs from 'dayjs'
import { sum } from 'lodash'
import { useEffect, useState } from 'react'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, tokenIconUrl } from '~/utils'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { generateGoogleCalendarUrl } from '~/utils/calendar'

const ProtocolPageButton = () => {
	return (
		<Ariakit.MenuButton className="flex items-center gap-2 hover:bg-(--bg2) p-2 rounded-sm">
			<Icon name="calendar-plus" width={16} height={16} />
			Add to Calendar
		</Ariakit.MenuButton>
	)
}

const RegularButton = () => {
	return (
		<Ariakit.MenuButton className="flex items-center gap-2">
			<div className="flex space-x-2">
				<div className="flex flex-col items-center">
					<div className="text-white bg-[#2C2C2E] dark:bg-zinc-800 hover:bg-(--bg2) hover:text-black transition-colors rounded-lg w-10 h-10 flex items-center justify-center mb-4">
						<Icon name="calendar-plus" width={24} height={24} />
					</div>
				</div>
			</div>
		</Ariakit.MenuButton>
	)
}

export const CalendarButton = ({ event, tokenName, tokenValue, isProtocolPage }) => {
	return (
		<Ariakit.MenuProvider>
			{isProtocolPage ? <ProtocolPageButton /> : <RegularButton />}

			<Ariakit.Menu
				unmountOnHide
				gutter={8}
				className="flex flex-col bg-(--bg1) rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
			>
				<Ariakit.MenuItem
					render={
						<a
							href={generateGoogleCalendarUrl(event, tokenName, tokenValue)}
							target="_blank"
							rel="noopener noreferrer"
						/>
					}
					className="flex items-center gap-2 py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer first-of-type:rounded-t-md border-b border-(--form-control-border)"
				>
					<Icon name="external-link" width={16} height={16} />
					Google Calendar
				</Ariakit.MenuItem>

				<Ariakit.MenuItem
					render={
						<a href={`/api/calendar/${tokenName}?timestamp=${event.timestamp}&value=${tokenValue}&name=${tokenName}`} />
					}
					className="flex items-center gap-2 py-2 px-3 shrink-0 hover:bg-(--primary1-hover) focus-visible:bg-(--primary1-hover) data-active-item:bg-(--primary1-hover) cursor-pointer last-of-type:rounded-b-md"
				>
					<Icon name="download-cloud" width={16} height={16} />
					Other Calendars Apps
				</Ariakit.MenuItem>
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}

export const UpcomingEvent = ({
	noOfTokens = [],
	timestamp,
	event,
	price,
	symbol,
	mcap,
	maxSupply,
	name,
	isProtocolPage = false
}) => {
	const tokenPrice = price
	const tokenSymbol = tokenPrice?.symbol?.toUpperCase() || symbol?.toUpperCase()
	const currentUnlockBreakdown = event.map(({ description, noOfTokens, timestamp, unlockType, rateDurationDays }) => {
		const regex =
			/(?:of (.+?) tokens (?:will be|were) unlocked)|(?:will (?:increase|decrease) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})|(?:from (.+?) on {timestamp})|(?:was (?:increased|decreased) from \{tokens\[0\]\} to \{tokens\[1]\} tokens per week from (.+?) on {timestamp})/
		const matches = description.match(regex)
		const name = matches?.[1] || matches?.[2] || matches?.[3] || matches?.[4] || ''

		let perDayAmount, totalAmount, displayUnit
		if (unlockType === 'linear') {
			const isIncrease = description.toLowerCase().includes('increase')
			perDayAmount = (isIncrease ? noOfTokens[1] : noOfTokens[0]) / 7
			totalAmount = perDayAmount * (rateDurationDays || 1)
			displayUnit = 'per day'
		} else {
			perDayAmount = totalAmount = sum(noOfTokens)
			displayUnit = ''
		}
		return {
			name,
			perDayAmount,
			totalAmount,
			displayUnit,
			timestamp,
			unlockType
		}
	})

	const totalAmount = sum(currentUnlockBreakdown.map((item) => item.totalAmount))
	const tokenValue = price ? totalAmount * price : null
	const unlockPercent = maxSupply ? (totalAmount / maxSupply) * 100 : null
	const unlockPercentFloat = tokenValue && mcap ? (tokenValue / mcap) * 100 : null

	const timeLeft = timestamp - Date.now() / 1e3
	const days = Math.floor(timeLeft / 86400)
	const hours = Math.floor((timeLeft - 86400 * days) / 3600)
	const minutes = Math.floor((timeLeft - 86400 * days - 3600 * hours) / 60)
	const seconds = Math.floor(timeLeft - 86400 * days - 3600 * hours - minutes * 60)
	const [_, rerender] = useState(1)

	useEffect(() => {
		if (timeLeft <= 0) return
		const id = setInterval(() => rerender((value) => value + 1), 1000)

		return () => clearInterval(id)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	if (isProtocolPage) {
		return (
			<span className="rounded-md bg-(--bg1) dark:bg-[#121316] p-3 border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] z-10 flex flex-col gap-2">
				<span className="flex items-center gap-2 justify-between">
					<span className="flex flex-col px-2">
						<span className="font-semibold">Unlock Value:</span>
						{tokenValue ? formattedNum(tokenValue, true) : <span>{formattedNum(unlockPercent)}%</span>}
						{unlockPercent ? (
							<span className="text-(--text3)">
								{tokenValue ? formattedNum(unlockPercent) + '%' : null}
								{unlockPercentFloat ? <>({formattedNum(unlockPercentFloat)}% of float)</> : null}
							</span>
						) : null}
					</span>
					<span className="flex flex-col px-2">
						<span className="text-right font-medium text-(--text2) flex flex-col">
							{timestamp ? dayjs(timestamp * 1e3).format('MMM D, YYYY') : null}
							<span className="text-(--text2)">
								{timestamp ? `${dayjs(timestamp * 1e3).format('h:mm A')} ` : null}
								<span className="text-(--text3) text-sm">
									{timestamp
										? `GMT${dayjs(timestamp * 1e3)
												.format('Z')
												.slice(0, 3)}`
										: ''}
								</span>
							</span>
						</span>
						{timeLeft > 0 ? (
							<span
								className="bg-(--bg4) rounded-md text-sm px-3 py-1.5 flex items-center justify-center"
								suppressHydrationWarning
							>
								{days}D {hours}H {minutes}M {seconds}S
							</span>
						) : (
							<span className="flex items-center justify-end gap-1">
								<span
									className="bg-(--bg4) rounded-md text-sm h-8 w-8 flex items-center justify-center"
									style={{ width: 'fit-content', padding: '0px 8px' }}
								>
									{Math.abs(days)} days ago
								</span>
							</span>
						)}
					</span>
				</span>

				<hr className="border-(--bg4)" />
				<span className="flex flex-col gap-4">
					{currentUnlockBreakdown.map(({ name, perDayAmount, totalAmount, unlockType, displayUnit, timestamp }) => {
						const isLinearPerDay = unlockType === 'linear' && displayUnit === 'per day'
						const usdValue = price
							? isLinearPerDay
								? perDayAmount * price // per day value for linear
								: totalAmount * price // total for cliff
							: null
						const percentage = maxSupply ? (totalAmount / maxSupply) * 100 : null
						const percentageFloat = usdValue && mcap ? (usdValue / mcap) * 100 : null
						return (
							<span className="flex flex-col gap-1" key={name + totalAmount}>
								<span className="flex items-center justify-between gap-2">
									<span className="flex items-center gap-2">
										{name}
										<Ariakit.TooltipProvider>
											<Ariakit.TooltipAnchor>
												<Icon
													name={unlockType === 'linear' ? 'linear-unlock' : 'cliff-unlock'}
													height={16}
													width={16}
													className="text-(--text3)"
												/>
											</Ariakit.TooltipAnchor>
											<Ariakit.Tooltip className="rounded-md bg-(--bg2) px-2 py-1 text-sm z-50">
												{unlockType === 'linear' ? 'Linear Unlock' : 'Cliff Unlock'}
											</Ariakit.Tooltip>
										</Ariakit.TooltipProvider>
									</span>
									<span className="inline-flex items-baseline gap-1">
										{usdValue ? formattedNum(usdValue, true) : '-'}
										{isLinearPerDay && <span className="text-xs text-(--text3)">/ day</span>}
									</span>
								</span>
								<span className="flex items-center justify-between gap-2 text-(--text3)">
									<span>
										{formattedNum(percentage)}%{' '}
										{percentageFloat ? <>( {formattedNum(percentageFloat)}% of float)</> : null}
									</span>
									<span className="inline-flex items-baseline gap-1">
										{formattedNum(isLinearPerDay ? perDayAmount : totalAmount)} {tokenSymbol}
										{isLinearPerDay && <span className="text-xs text-(--text3)">/ day</span>}
									</span>
								</span>
							</span>
						)
					})}
				</span>

				{timeLeft > 0 && (
					<CalendarButton
						event={{ timestamp, noOfTokens, symbol, description: '' }}
						tokenName={name}
						tokenValue={tokenValue ? formattedNum(tokenValue, true) : '-'}
						isProtocolPage={isProtocolPage}
					/>
				)}
			</span>
		)
	}

	return (
		<div className="flex items-center gap-2">
			<Ariakit.HovercardProvider timeout={0}>
				<Ariakit.HovercardAnchor>
					{timeLeft > 0 ? (
						<div className="flex space-x-2 items-center">
							<div className="flex justify-between items-end" style={{ width: '150px' }}>
								<div className="flex flex-col items-start">
									<span className="text-(--text1) text-sm font-semibold">{formattedNum(tokenValue, true)}</span>
									<span className="text-(--text3) text-xs font-medium">Unlock Value</span>
								</div>
								<div className="flex flex-col items-end">
									<span className="text-(--text1) text-sm font-semibold">{formattedNum(unlockPercentFloat)}%</span>
									<span className="text-(--text3) text-xs font-medium">of float</span>
								</div>
							</div>

							<div className="flex flex-col items-center">
								<div className="bg-[#2C2C2E] dark:bg-zinc-800 rounded-lg w-10 h-10 flex items-center justify-center">
									<span className="text-white text-xl font-medium tracking-tight">{String(days).padStart(2, '0')}</span>
								</div>
								<span className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">Days</span>
							</div>

							<div className="flex flex-col items-center">
								<div className="bg-[#2C2C2E] dark:bg-zinc-800 rounded-lg w-10 h-10 flex items-center justify-center">
									<span className="text-white text-xl font-medium tracking-tight">
										{String(hours).padStart(2, '0')}
									</span>
								</div>
								<span className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">Hrs</span>
							</div>

							<div className="flex flex-col items-center">
								<div className="bg-[#2C2C2E] dark:bg-zinc-800 rounded-lg w-10 h-10 flex items-center justify-center">
									<span className="text-white text-xl font-medium tracking-tight">
										{String(minutes).padStart(2, '0')}
									</span>
								</div>
								<span className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">Min</span>
							</div>

							<div className="flex flex-col items-center">
								<div className="bg-[#2C2C2E] dark:bg-zinc-800 rounded-lg w-10 h-10 flex items-center justify-center">
									<span className="text-white text-xl font-medium tracking-tight">
										{String(seconds).padStart(2, '0')}
									</span>
								</div>
								<span className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">Sec</span>
							</div>
						</div>
					) : (
						<span className="text-sm text-neutral-500 dark:text-neutral-400">
							{Math.abs(days)} {Math.abs(days) === 1 ? 'day' : 'days'} ago
						</span>
					)}
				</Ariakit.HovercardAnchor>
				<Ariakit.HovercardDisclosure />
				<Ariakit.Hovercard
					className="rounded-md bg-(--bg1) dark:bg-[#121316] p-4 border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] z-10 flex flex-col gap-2"
					unmountOnHide
					portal={true}
				>
					<span className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<TokenLogo logo={tokenIconUrl(name)} size={30} />
							{tokenSymbol}
						</span>
						<span className="flex flex-col">
							<span>{timestamp ? dayjs(timestamp * 1e3).format('MMM D, YYYY') : null}</span>
							<span className="text-sm text-(--text3)">
								{timestamp
									? `${dayjs(timestamp * 1e3).format('HH:mm')} GMT${dayjs(timestamp * 1e3)
											.format('Z')
											.slice(0, 3)}`
									: null}
							</span>
						</span>
					</span>
					<hr className="border-(--bg4)" />
					<span className="flex flex-col gap-4">
						{currentUnlockBreakdown.map(({ name, perDayAmount, totalAmount, unlockType, displayUnit, timestamp }) => {
							const isLinearPerDay = unlockType === 'linear' && displayUnit === 'per day'
							const usdValue = price
								? isLinearPerDay
									? perDayAmount * price // per day value for linear
									: totalAmount * price // total for cliff
								: null
							const percentage = maxSupply ? (totalAmount / maxSupply) * 100 : null
							const percentageFloat = usdValue && mcap ? (usdValue / mcap) * 100 : null
							return (
								<span className="flex flex-col gap-1" key={name + totalAmount}>
									<span className="flex items-center justify-between gap-2">
										<span className="flex items-center gap-2">
											{name}
											<Ariakit.TooltipProvider>
												<Ariakit.TooltipAnchor>
													<Icon
														name={unlockType === 'linear' ? 'linear-unlock' : 'cliff-unlock'}
														height={16}
														width={16}
														className="text-(--text3)"
													/>
												</Ariakit.TooltipAnchor>
												<Ariakit.Tooltip className="rounded-md bg-(--bg2) px-2 py-1 text-sm z-50">
													{unlockType === 'linear' ? 'Linear Unlock' : 'Cliff Unlock'}
												</Ariakit.Tooltip>
											</Ariakit.TooltipProvider>
										</span>
										<span className="inline-flex items-baseline gap-1">
											{usdValue ? formattedNum(usdValue, true) : '-'}
											{isLinearPerDay && <span className="text-xs text-(--text3)">/ day</span>}
										</span>
									</span>
									<span className="flex items-center justify-between gap-2 text-(--text3)">
										<span>
											{formattedNum(percentage)}%{' '}
											{percentageFloat ? <>( {formattedNum(percentageFloat)}% of float)</> : null}
										</span>
										<span className="inline-flex items-baseline gap-1">
											{formattedNum(isLinearPerDay ? perDayAmount : totalAmount)} {tokenSymbol}
											{isLinearPerDay && <span className="text-xs text-(--text3)">/ day</span>}
										</span>
									</span>
								</span>
							)
						})}
					</span>
					<hr className="border-(--bg4)" />

					<span className="flex flex-col gap-1">
						<span className="flex items-center justify-between gap-2 font-semibold">
							<span>Total</span>
							<span>{tokenValue ? formattedNum(tokenValue, true) : '-'}</span>
						</span>
						<span className="flex items-center justify-between gap-2 text-(--text3)">
							<span>
								{unlockPercent && `${formattedNum(unlockPercent)}%`}
								{unlockPercentFloat && ` (${formattedNum(unlockPercentFloat)}% of float)`}
							</span>
							<span>
								{formattedNum(totalAmount)} {tokenSymbol}
							</span>
						</span>
					</span>
				</Ariakit.Hovercard>
			</Ariakit.HovercardProvider>
			{timeLeft > 0 && (
				<CalendarButton
					event={{ timestamp, noOfTokens, symbol, description: '' }}
					tokenName={name}
					tokenValue={tokenValue ? formattedNum(tokenValue, true) : '-'}
					isProtocolPage={isProtocolPage}
				/>
			)}
		</div>
	)
}
