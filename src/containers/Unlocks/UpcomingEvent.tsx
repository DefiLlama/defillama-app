import * as Ariakit from '@ariakit/react'
import dayjs from 'dayjs'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, tokenIconUrl } from '~/utils'
import { generateGoogleCalendarUrl } from '~/utils/calendar'

interface CalendarButtonProps {
	event: { timestamp: number; noOfTokens: number[][]; symbol: string; description: string }
	tokenName: string
	tokenValue: string | null
	isProtocolPage: boolean
}

const ProtocolPageButton = () => {
	return (
		<Ariakit.MenuButton className="flex items-center gap-2 rounded-sm p-2 hover:bg-(--bg-secondary)">
			<Icon name="calendar-plus" width={16} height={16} />
			Add to Calendar
		</Ariakit.MenuButton>
	)
}

const RegularButton = () => {
	return (
		<Ariakit.MenuButton
			className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--text-primary) hover:bg-(--bg-border)"
			aria-label="Add to calendar"
		>
			<Icon name="calendar-plus" width={20} height={20} />
		</Ariakit.MenuButton>
	)
}

export const CalendarButton = ({ event, tokenName, tokenValue, isProtocolPage }: CalendarButtonProps) => {
	return (
		<Ariakit.MenuProvider>
			{isProtocolPage ? <ProtocolPageButton /> : <RegularButton />}

			<Ariakit.Menu
				unmountOnHide
				hideOnInteractOutside
				gutter={8}
				className="z-10 flex thin-scrollbar max-h-[60dvh] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-(--cards-border) bg-(--cards-bg) text-(--text-primary) shadow-sm max-sm:drawer max-sm:rounded-b-none"
				portal
			>
				<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.PopoverDismiss>

			<Ariakit.MenuItem
				render={
					<a
						href={generateGoogleCalendarUrl(
							{ ...event, name: tokenName, noOfTokens: event.noOfTokens.flat() },
							tokenName,
							tokenValue ? parseFloat(tokenValue.replace(/[^0-9.-]+/g, '')) || 0 : 0
						)}
						target="_blank"
						rel="noopener noreferrer"
					/>
					}
					className="flex shrink-0 cursor-pointer items-center gap-2 border-b border-(--bg-border) px-3 py-2 first-of-type:rounded-t-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
				>
					<Icon name="external-link" width={16} height={16} />
					Google Calendar
				</Ariakit.MenuItem>

				<Ariakit.MenuItem
					render={
						<a href={`/api/calendar/${tokenName}?timestamp=${event.timestamp}&value=${tokenValue}&name=${tokenName}`} />
					}
					className="flex shrink-0 cursor-pointer items-center gap-2 px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
				>
					<Icon name="download-cloud" width={16} height={16} />
					Other Calendars Apps
				</Ariakit.MenuItem>
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}

const CountdownTile = ({ value, label }: { value: string; label: string }) => {
	return (
		<div className="flex flex-col items-center">
			<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--bg-tertiary)">
				<span className="text-base font-semibold tracking-tight text-(--text-primary) tabular-nums">{value}</span>
			</div>
			<span className="mt-1 text-xs leading-none font-medium text-(--text-meta)">{label}</span>
		</div>
	)
}

interface UpcomingEventProps {
	noOfTokens?: number[][]
	timestamp: number
	event: Array<{
		description: string
		noOfTokens: number[]
		timestamp: number
		unlockType?: string
		rateDurationDays?: number
	}>
	price: number | null | undefined
	symbol: string | null | undefined
	mcap: number | null
	maxSupply: number
	name: string
	isProtocolPage?: boolean
}

interface UnlockBreakdown {
	name: string
	perDayAmount: number
	totalAmount: number
	displayUnit: string
	timestamp: number
	unlockType: string
	isOngoing: boolean
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
}: UpcomingEventProps) => {
	const tokenSymbol = symbol ? symbol.toUpperCase() : ''
	const { currentUnlockBreakdown, totalAmount, tokenValue, unlockPercent, unlockPercentFloat } = useMemo(() => {
		const breakdown: UnlockBreakdown[] = event
			.map(({ description, noOfTokens, timestamp, unlockType, rateDurationDays }) => {
				const regex =
					/(?:of (.+?) tokens (?:will be|were) unlocked)|(?:will (?:increase|decrease) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})|(?:from (.+?) on {timestamp})|(?:was (?:increased|decreased) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})/
				const matches = (description || '').match(regex)
				const eventName = matches?.[1] || matches?.[2] || matches?.[3] || matches?.[4] || ''

				let perDayAmount: number, totalAmount: number, displayUnit: string
				if (unlockType === 'linear') {
					const isIncrease = (description || '').toLowerCase().includes('increase')
					perDayAmount = (isIncrease ? noOfTokens[1] : noOfTokens[0]) / 7
					totalAmount = perDayAmount * (rateDurationDays || 1)
					displayUnit = 'per day'
				} else {
					perDayAmount = totalAmount = noOfTokens.reduce((sum: number, amount: number) => sum + amount, 0)
					displayUnit = ''
				}
				const currentTime = Date.now() / 1e3
				const endTime = timestamp + (rateDurationDays || 0) * 86400
				const isOngoing = unlockType === 'linear' && currentTime >= timestamp && currentTime <= endTime
				return {
					name: eventName,
					perDayAmount,
					totalAmount,
					displayUnit,
					timestamp,
					unlockType: unlockType || 'cliff',
					isOngoing
				}
			})
			.sort((a: UnlockBreakdown, b: UnlockBreakdown) => b.totalAmount - a.totalAmount)

		const totalAmount = breakdown.reduce((sum: number, item: UnlockBreakdown) => sum + item.totalAmount, 0)
		const tokenValue = price ? totalAmount * price : null
		const unlockPercent = maxSupply ? (totalAmount / maxSupply) * 100 : null
		const unlockPercentFloat = tokenValue && mcap ? (tokenValue / mcap) * 100 : null

		return { currentUnlockBreakdown: breakdown, totalAmount, tokenValue, unlockPercent, unlockPercentFloat }
	}, [event, price, maxSupply, mcap])

	const timeLeft = timestamp - Date.now() / 1e3
	const days = Math.floor(timeLeft / 86400)
	const hours = Math.floor((timeLeft - 86400 * days) / 3600)
	const minutes = Math.floor((timeLeft - 86400 * days - 3600 * hours) / 60)
	const seconds = Math.floor(timeLeft - 86400 * days - 3600 * hours - minutes * 60)
	const [_, rerender] = useState(1)

	const onCountdownTick = useEffectEvent(() => {
		rerender((value) => value + 1)
	})

	useEffect(() => {
		const now = Date.now() / 1e3
		if (timestamp <= now) return
		const id = setInterval(() => {
			onCountdownTick()
		}, 1000)

		return () => clearInterval(id)
	}, [timestamp])

	if (isProtocolPage) {
		return (
			<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="flex items-center justify-between gap-2">
					<div className="flex flex-col">
						<span className="text-xs text-(--text-label)">Unlock Value</span>
						<span className="text-sm font-semibold">
							{tokenValue ? formattedNum(tokenValue, true) : <span>{formattedNum(unlockPercent)}%</span>}
						</span>
						{unlockPercent ? (
							<span className="text-xs text-(--text-meta)">
								{tokenValue ? formattedNum(unlockPercent) + '%' : null}
								{unlockPercentFloat ? <> ({formattedNum(unlockPercentFloat)}% of float)</> : null}
							</span>
						) : null}
					</div>
					<div className="flex flex-col items-end">
						<span className="text-sm font-medium">
							{timestamp ? dayjs(timestamp * 1e3).format('MMM D, YYYY') : null}
						</span>
						<span className="text-xs text-(--text-meta)">
							{timestamp ? `${dayjs(timestamp * 1e3).format('h:mm A')} GMT${dayjs(timestamp * 1e3).format('Z')}` : ''}
						</span>
						{timeLeft > 0 ? (
							<span
								className="mt-1 rounded-md bg-(--bg-border) px-2 py-1 text-xs font-medium tabular-nums"
								suppressHydrationWarning
							>
								{days}D {hours}H {minutes}M {seconds}S
							</span>
						) : (
							<span className="mt-1 rounded-md bg-(--bg-border) px-2 py-1 text-xs font-medium">
								{Math.abs(days)} days ago
							</span>
						)}
					</div>
				</div>
				<hr className="border-(--bg-border)" />
				<div className="flex flex-col gap-3">
					{currentUnlockBreakdown.map(
						({ name, perDayAmount, totalAmount, unlockType, displayUnit, timestamp: _timestamp, isOngoing }) => {
							const isLinearPerDay = unlockType === 'linear' && displayUnit === 'per day'
							const usdValue = price ? (isLinearPerDay ? perDayAmount * price : totalAmount * price) : null
							const percentage = maxSupply ? (totalAmount / maxSupply) * 100 : null
							const percentageFloat = usdValue && mcap ? (usdValue / mcap) * 100 : null
							return (
								<div className="flex flex-col gap-0.5" key={name + totalAmount}>
									<div className="flex items-center justify-between gap-2 text-sm">
										<span className="flex items-center gap-1.5">
											{name}
											{isOngoing && ' (Ongoing)'}
											<Ariakit.TooltipProvider>
												<Ariakit.TooltipAnchor>
													<Icon
														name={unlockType === 'linear' ? 'linear-unlock' : 'cliff-unlock'}
														height={14}
														width={14}
														className="text-(--text-meta)"
													/>
												</Ariakit.TooltipAnchor>
												<Ariakit.Tooltip className="z-50 rounded-md bg-(--bg-secondary) px-2 py-1 text-xs">
													{unlockType === 'linear' ? 'Linear Unlock' : 'Cliff Unlock'}
												</Ariakit.Tooltip>
											</Ariakit.TooltipProvider>
										</span>
										<span className="inline-flex items-baseline gap-1 font-medium">
											{usdValue ? formattedNum(usdValue, true) : '-'}
											{isLinearPerDay ? <span className="text-xs text-(--text-meta)">/ day</span> : null}
										</span>
									</div>
									<div className="flex items-center justify-between gap-2 text-xs text-(--text-meta)">
										<span>
											{formattedNum(percentage)}%{' '}
											{percentageFloat ? <>({formattedNum(percentageFloat)}% of float)</> : null}
										</span>
										<span className="inline-flex items-baseline gap-1">
											{formattedNum(isLinearPerDay ? perDayAmount : totalAmount)} {tokenSymbol}
											{isLinearPerDay ? <span className="text-xs text-(--text-meta)">/ day</span> : null}
										</span>
									</div>
								</div>
							)
						}
					)}
				</div>
				{timeLeft > 0 ? (
					<CalendarButton
						event={{ timestamp, noOfTokens, symbol: symbol || '', description: '' }}
						tokenName={name}
						tokenValue={(tokenValue ? formattedNum(tokenValue, true) : '-') || null}
						isProtocolPage={isProtocolPage}
					/>
				) : null}
			</div>
		)
	}

	return (
		<div className="flex h-full items-center gap-2">
			<Ariakit.HovercardProvider timeout={0}>
				<Ariakit.HovercardAnchor>
					{timeLeft > 0 ? (
						<div className="flex items-center gap-3">
							<div className="flex min-w-[150px] items-center justify-between gap-4">
								<div className="flex flex-col items-start">
									<span className="text-sm font-semibold text-(--text-primary) tabular-nums">
										{formattedNum(tokenValue, true)}
									</span>
									<span className="text-xs font-medium text-(--text-meta)">Unlock Value</span>
								</div>
								<div className="flex flex-col items-end">
									<span className="text-sm font-semibold text-(--text-primary) tabular-nums">
										{formattedNum(unlockPercentFloat)}%
									</span>
									<span className="text-xs font-medium text-(--text-meta)">of float</span>
								</div>
							</div>

							<div className="flex items-center gap-2" suppressHydrationWarning>
								<CountdownTile value={String(days).padStart(2, '0')} label="Days" />
								<CountdownTile value={String(hours).padStart(2, '0')} label="Hrs" />
								<CountdownTile value={String(minutes).padStart(2, '0')} label="Min" />
								<CountdownTile value={String(seconds).padStart(2, '0')} label="Sec" />
							</div>
						</div>
					) : (
						<span className="text-sm text-(--text-meta)" suppressHydrationWarning>
							{Math.abs(days)} {Math.abs(days) === 1 ? 'day' : 'days'} ago
						</span>
					)}
				</Ariakit.HovercardAnchor>
				<Ariakit.HovercardDisclosure />
				<Ariakit.Hovercard
					className="z-10 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--bg-secondary) p-4 text-sm text-(--text-primary) shadow-sm"
					unmountOnHide
					hideOnInteractOutside
					portal={true}
				>
					<span className="flex items-center justify-between gap-4">
						<span className="flex items-center gap-2 font-medium">
							<TokenLogo logo={tokenIconUrl(name)} size={30} />
							{tokenSymbol}
						</span>
						<span className="flex flex-col items-end">
							<span className="font-medium">{timestamp ? dayjs(timestamp * 1e3).format('MMM D, YYYY') : null}</span>
							<span className="text-xs text-(--text-meta)">
								{timestamp
									? `${dayjs(timestamp * 1e3).format('HH:mm')} GMT${dayjs(timestamp * 1e3).format('Z')}`
									: null}
							</span>
						</span>
					</span>
					<hr className="border-(--bg-border)" />
					<span className="flex flex-col gap-4">
						{currentUnlockBreakdown.map(
							({ name, perDayAmount, totalAmount, unlockType, displayUnit, timestamp: _timestamp, isOngoing }) => {
								const isLinearPerDay = unlockType === 'linear' && displayUnit === 'per day'
								const usdValue = price ? (isLinearPerDay ? perDayAmount * price : totalAmount * price) : null
								const percentage = maxSupply ? (totalAmount / maxSupply) * 100 : null
								const percentageFloat = usdValue && mcap ? (usdValue / mcap) * 100 : null
								return (
									<span className="flex flex-col gap-1" key={name + totalAmount}>
										<span className="flex items-center justify-between gap-2">
											<span className="flex items-center gap-2">
												{name}
												{isOngoing && ' (Ongoing)'}
												<Ariakit.TooltipProvider>
													<Ariakit.TooltipAnchor>
														<Icon
															name={unlockType === 'linear' ? 'linear-unlock' : 'cliff-unlock'}
															height={16}
															width={16}
															className="text-(--text-meta)"
														/>
													</Ariakit.TooltipAnchor>
													<Ariakit.Tooltip className="z-50 rounded-md bg-(--bg-secondary) px-2 py-1 text-xs">
														{unlockType === 'linear' ? 'Linear Unlock' : 'Cliff Unlock'}
													</Ariakit.Tooltip>
												</Ariakit.TooltipProvider>
											</span>
											<span className="inline-flex items-baseline gap-1 font-medium">
												{usdValue ? formattedNum(usdValue, true) : '-'}
												{isLinearPerDay && <span className="text-xs text-(--text-meta)">/ day</span>}
											</span>
										</span>
										<span className="flex items-center justify-between gap-2 text-xs text-(--text-meta)">
											<span>
												{formattedNum(percentage)}%{' '}
												{percentageFloat ? <>({formattedNum(percentageFloat)}% of float)</> : null}
											</span>
											<span className="inline-flex items-baseline gap-1">
												{formattedNum(isLinearPerDay ? perDayAmount : totalAmount)} {tokenSymbol}
												{isLinearPerDay && <span className="text-xs text-(--text-meta)">/ day</span>}
											</span>
										</span>
									</span>
								)
							}
						)}
					</span>
					<hr className="border-(--bg-border)" />

					<span className="flex flex-col gap-1">
						<span className="flex items-center justify-between gap-2 font-semibold">
							<span>Total</span>
							<span>{tokenValue ? formattedNum(tokenValue, true) : '-'}</span>
						</span>
						<span className="flex items-center justify-between gap-2 text-xs text-(--text-meta)">
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
				<div className="flex flex-col items-center">
					<CalendarButton
						event={{ timestamp, noOfTokens, symbol: symbol || '', description: '' }}
						tokenName={name}
						tokenValue={(tokenValue ? formattedNum(tokenValue, true) : '-') || null}
						isProtocolPage={isProtocolPage}
					/>
					<span className="invisible mt-1 text-xs leading-none font-medium text-(--text-meta) select-none">Sec</span>
				</div>
			)}
		</div>
	)
}
