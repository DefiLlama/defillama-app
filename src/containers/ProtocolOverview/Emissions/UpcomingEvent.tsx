import { useEffect, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import dayjs from 'dayjs'
import { sum } from 'lodash'
import { Icon } from '~/components/Icon'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, tokenIconUrl } from '~/utils'
import { generateGoogleCalendarUrl } from '~/utils/calendar'

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
		<Ariakit.MenuButton className="flex items-center gap-2">
			<div className="flex space-x-2">
				<div className="flex flex-col items-center">
					<div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#2C2C2E] text-white transition-colors hover:bg-(--bg-secondary) hover:text-black dark:bg-zinc-800">
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
				hideOnInteractOutside
				gutter={8}
				className="max-sm:drawer z-10 flex max-h-[60vh] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none dark:border-[hsl(204,3%,32%)]"
				portal
			>
				<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.PopoverDismiss>

				<Ariakit.MenuItem
					render={
						<a
							href={generateGoogleCalendarUrl(event, tokenName, tokenValue)}
							target="_blank"
							rel="noopener noreferrer"
						/>
					}
					className="flex shrink-0 cursor-pointer items-center gap-2 border-b border-(--form-control-border) px-3 py-2 first-of-type:rounded-t-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
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
			<span className="z-10 flex flex-col gap-2 rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-3 dark:border-[hsl(204,3%,32%)] dark:bg-[#121316]">
				<span className="flex items-center justify-between gap-2">
					<span className="flex flex-col px-2">
						<span className="font-semibold">Unlock Value:</span>
						{tokenValue ? formattedNum(tokenValue, true) : <span>{formattedNum(unlockPercent)}%</span>}
						{unlockPercent ? (
							<span className="text-(--text-tertiary)">
								{tokenValue ? formattedNum(unlockPercent) + '%' : null}
								{unlockPercentFloat ? <>({formattedNum(unlockPercentFloat)}% of float)</> : null}
							</span>
						) : null}
					</span>
					<span className="flex flex-col px-2">
						<span className="flex flex-col text-right font-medium text-(--text-secondary)">
							{timestamp ? dayjs(timestamp * 1e3).format('MMM D, YYYY') : null}
							<span className="text-(--text-secondary)">
								{timestamp ? `${dayjs(timestamp * 1e3).format('h:mm A')} ` : null}
								<span className="text-sm text-(--text-tertiary)">
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
								className="flex items-center justify-center rounded-md bg-(--bg-border) px-3 py-1.5 text-sm"
								suppressHydrationWarning
							>
								{days}D {hours}H {minutes}M {seconds}S
							</span>
						) : (
							<span className="flex items-center justify-end gap-1">
								<span
									className="flex h-8 w-8 items-center justify-center rounded-md bg-(--bg-border) text-sm"
									style={{ width: 'fit-content', padding: '0px 8px' }}
								>
									{Math.abs(days)} days ago
								</span>
							</span>
						)}
					</span>
				</span>

				<hr className="border-(--bg-border)" />
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
													className="text-(--text-tertiary)"
												/>
											</Ariakit.TooltipAnchor>
											<Ariakit.Tooltip className="z-50 rounded-md bg-(--bg-secondary) px-2 py-1 text-sm">
												{unlockType === 'linear' ? 'Linear Unlock' : 'Cliff Unlock'}
											</Ariakit.Tooltip>
										</Ariakit.TooltipProvider>
									</span>
									<span className="inline-flex items-baseline gap-1">
										{usdValue ? formattedNum(usdValue, true) : '-'}
										{isLinearPerDay && <span className="text-xs text-(--text-tertiary)">/ day</span>}
									</span>
								</span>
								<span className="flex items-center justify-between gap-2 text-(--text-tertiary)">
									<span>
										{formattedNum(percentage)}%{' '}
										{percentageFloat ? <>( {formattedNum(percentageFloat)}% of float)</> : null}
									</span>
									<span className="inline-flex items-baseline gap-1">
										{formattedNum(isLinearPerDay ? perDayAmount : totalAmount)} {tokenSymbol}
										{isLinearPerDay && <span className="text-xs text-(--text-tertiary)">/ day</span>}
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
						<div className="flex items-center space-x-2">
							<div className="flex items-end justify-between" style={{ width: '150px' }}>
								<div className="flex flex-col items-start">
									<span className="text-sm font-semibold text-(--text-primary)">{formattedNum(tokenValue, true)}</span>
									<span className="text-xs font-medium text-(--text-tertiary)">Unlock Value</span>
								</div>
								<div className="flex flex-col items-end">
									<span className="text-sm font-semibold text-(--text-primary)">
										{formattedNum(unlockPercentFloat)}%
									</span>
									<span className="text-xs font-medium text-(--text-tertiary)">of float</span>
								</div>
							</div>

							<div className="flex flex-col items-center">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2C2C2E] dark:bg-zinc-800">
									<span className="text-xl font-medium tracking-tight text-white">{String(days).padStart(2, '0')}</span>
								</div>
								<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Days</span>
							</div>

							<div className="flex flex-col items-center">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2C2C2E] dark:bg-zinc-800">
									<span className="text-xl font-medium tracking-tight text-white">
										{String(hours).padStart(2, '0')}
									</span>
								</div>
								<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Hrs</span>
							</div>

							<div className="flex flex-col items-center">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2C2C2E] dark:bg-zinc-800">
									<span className="text-xl font-medium tracking-tight text-white">
										{String(minutes).padStart(2, '0')}
									</span>
								</div>
								<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Min</span>
							</div>

							<div className="flex flex-col items-center">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2C2C2E] dark:bg-zinc-800">
									<span className="text-xl font-medium tracking-tight text-white">
										{String(seconds).padStart(2, '0')}
									</span>
								</div>
								<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Sec</span>
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
					className="z-10 flex flex-col gap-2 rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-4 dark:border-[hsl(204,3%,32%)] dark:bg-[#121316]"
					unmountOnHide
					hideOnInteractOutside
					portal={true}
				>
					<span className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<TokenLogo logo={tokenIconUrl(name)} size={30} />
							{tokenSymbol}
						</span>
						<span className="flex flex-col">
							<span>{timestamp ? dayjs(timestamp * 1e3).format('MMM D, YYYY') : null}</span>
							<span className="text-sm text-(--text-tertiary)">
								{timestamp
									? `${dayjs(timestamp * 1e3).format('HH:mm')} GMT${dayjs(timestamp * 1e3)
											.format('Z')
											.slice(0, 3)}`
									: null}
							</span>
						</span>
					</span>
					<hr className="border-(--bg-border)" />
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
														className="text-(--text-tertiary)"
													/>
												</Ariakit.TooltipAnchor>
												<Ariakit.Tooltip className="z-50 rounded-md bg-(--bg-secondary) px-2 py-1 text-sm">
													{unlockType === 'linear' ? 'Linear Unlock' : 'Cliff Unlock'}
												</Ariakit.Tooltip>
											</Ariakit.TooltipProvider>
										</span>
										<span className="inline-flex items-baseline gap-1">
											{usdValue ? formattedNum(usdValue, true) : '-'}
											{isLinearPerDay && <span className="text-xs text-(--text-tertiary)">/ day</span>}
										</span>
									</span>
									<span className="flex items-center justify-between gap-2 text-(--text-tertiary)">
										<span>
											{formattedNum(percentage)}%{' '}
											{percentageFloat ? <>( {formattedNum(percentageFloat)}% of float)</> : null}
										</span>
										<span className="inline-flex items-baseline gap-1">
											{formattedNum(isLinearPerDay ? perDayAmount : totalAmount)} {tokenSymbol}
											{isLinearPerDay && <span className="text-xs text-(--text-tertiary)">/ day</span>}
										</span>
									</span>
								</span>
							)
						})}
					</span>
					<hr className="border-(--bg-border)" />

					<span className="flex flex-col gap-1">
						<span className="flex items-center justify-between gap-2 font-semibold">
							<span>Total</span>
							<span>{tokenValue ? formattedNum(tokenValue, true) : '-'}</span>
						</span>
						<span className="flex items-center justify-between gap-2 text-(--text-tertiary)">
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
