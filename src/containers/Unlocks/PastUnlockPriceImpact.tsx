import * as Ariakit from '@ariakit/react'
import dayjs from 'dayjs'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, renderPercentChange, slug, tokenIconUrl } from '~/utils'
import type { ProtocolEmissionWithHistory } from './types'

/** Protocols that have confirmed tPrice and tSymbol (caller pre-filters nulls). */
type ProtocolData = ProtocolEmissionWithHistory & { tPrice: number; tSymbol: string }

interface PastUnlockPriceImpactProps {
	data: ProtocolData[]
	title?: string
	className?: string
	initialNowSec?: number
}

interface UnlockBreakdown {
	name: string
	amount: number
	timestamp: number
	unlockType: string
}

const DESCRIPTION_REGEX =
	/(?:of (.+?) tokens (?:will be|were) unlocked)|(?:will (?:increase|decrease) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})|(?:from (.+?) on {timestamp})|(?:was (?:increased|decreased) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})/

const parseDescription = (description: string): string => {
	const matches = description.match(DESCRIPTION_REGEX)
	return matches?.[1] || matches?.[2] || matches?.[3] || matches?.[4] || ''
}

export const PastUnlockPriceImpact: React.FC<PastUnlockPriceImpactProps> = ({
	data,
	title,
	className,
	initialNowSec
}) => {
	const now = React.useMemo(
		() =>
			typeof initialNowSec === 'number' && Number.isFinite(initialNowSec)
				? Math.floor(initialNowSec)
				: Math.floor(Date.now() / 1000),
		[initialNowSec]
	)
	const { topImpacts } = React.useMemo(() => {
		const protocolImpacts = new Map<
			string,
			{
				name: string
				symbol: string
				impact: number
				value: number
				timestamp: number
				unlockBreakdown: UnlockBreakdown[]
				maxSupply?: number
				mcap?: number
				price: number
			}
		>()

		for (const protocol of data ?? []) {
			if (!protocol.historicalPrice?.length || protocol.historicalPrice.length < 8 || !protocol.lastEvent?.length)
				continue
			const thirtyDaysAgo = now - 30 * 24 * 60 * 60

			const lastEvents = protocol.lastEvent?.filter((event) => event.timestamp >= thirtyDaysAgo) || []
			if (!lastEvents.length) continue

			const eventsByTimestamp = lastEvents.reduce(
				(acc: Record<number, { totalTokens: number; events: typeof lastEvents }>, event) => {
					const totalTokens = event.noOfTokens?.reduce((sum: number, amount: number) => sum + amount, 0) || 0
					if (acc[event.timestamp]) {
						acc[event.timestamp].totalTokens += totalTokens
						acc[event.timestamp].events.push(event)
					} else {
						acc[event.timestamp] = {
							totalTokens,
							events: [event]
						}
					}
					return acc
				},
				{}
			)

			let latestTimestamp = -Infinity
			for (const ts in eventsByTimestamp) {
				const num = Number(ts)
				if (num > latestTimestamp) latestTimestamp = num
			}
			const latestEvent = eventsByTimestamp[latestTimestamp]

			const unlockValue = latestEvent.totalTokens * protocol.tPrice

			const priceAtUnlock = protocol.historicalPrice[7][1]
			const priceAfter7d = protocol.historicalPrice[protocol.historicalPrice.length - 1][1]
			const impact = ((priceAfter7d - priceAtUnlock) / priceAtUnlock) * 100

			const breakdown: UnlockBreakdown[] = []
			for (const event of latestEvent.events) {
				for (const amount of event.noOfTokens ?? []) {
					breakdown.push({
						name: parseDescription(event.description || ''),
						amount,
						timestamp: event.timestamp,
						unlockType: event.unlockType || 'cliff'
					})
				}
			}
			breakdown.sort((a, b) => b.amount - a.amount)

			protocolImpacts.set(protocol.name, {
				name: protocol.name,
				symbol: protocol.tSymbol,
				impact,
				value: unlockValue,
				timestamp: latestTimestamp,
				unlockBreakdown: breakdown,
				maxSupply: protocol.maxSupply ?? undefined,
				mcap: protocol.mcap ?? undefined,
				price: protocol.tPrice
			})
		}

		return {
			topImpacts: Array.from(protocolImpacts.values())
				.sort((a, b) => b.value - a.value)
				.slice(0, 3)
		}
	}, [data, now])

	return (
		<div className={`text-(--text-primary) ${className ?? ''}`}>
			<Tooltip
				className="text-base font-semibold text-(--text-primary)"
				content="Price change 7 days after the most recent major unlock event, not counting non-circulating and farming emissions. Sorted by the value of the unlock event."
			>
				{title}
			</Tooltip>

			{topImpacts.map((impact) => (
				<div key={impact.name} className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TokenLogo logo={tokenIconUrl(`${impact.name}`)} />
						<div className="flex flex-col">
							<BasicLink
								href={`/unlocks/${slug(impact.name)}`}
								className="overflow-hidden text-ellipsis whitespace-nowrap text-(--text-primary) hover:underline"
							>
								{impact.name} ({impact.symbol})
							</BasicLink>
						</div>
					</div>
					<div className="flex items-center gap-1">
						<span className="text-sm font-semibold tabular-nums">{renderPercentChange(impact.impact)}</span>
						<Ariakit.HovercardProvider>
							<Ariakit.HovercardAnchor>
								<Icon name="help-circle" width={16} height={16} className="cursor-help text-(--text-meta)" />
							</Ariakit.HovercardAnchor>
							<Ariakit.Hovercard
								className="z-10 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--bg-secondary) p-4 text-sm text-(--text-primary) shadow-sm"
								unmountOnHide
								hideOnInteractOutside
								portal={true}
							>
								<span className="flex items-center justify-between gap-4">
									<span className="flex items-center gap-2 font-medium">
										<TokenLogo logo={tokenIconUrl(impact.name)} size={30} />
										{impact.symbol}
									</span>
									<span className="flex flex-col items-end">
										<span className="font-medium">{dayjs(impact.timestamp * 1e3).format('MMM D, YYYY')}</span>
										<span className="text-xs text-(--text-meta)">
											{dayjs(impact.timestamp * 1e3).format('HH:mm')} GMT
											{dayjs(impact.timestamp * 1e3).format('Z')}
										</span>
									</span>
								</span>

								<hr className="border-(--bg-border)" />

								<span className="flex flex-col gap-4">
									{impact.unlockBreakdown.map((item) => {
										const percentage = impact.maxSupply ? (item.amount / impact.maxSupply) * 100 : null
										const percentageFloat = impact.mcap ? ((item.amount * impact.price) / impact.mcap) * 100 : null
										const usdValue = item.amount * impact.price

										return (
											<span
												className="flex flex-col gap-1"
												key={`unlock-${item.name}-${percentage}-${percentageFloat}-${usdValue}`}
											>
												<span className="flex items-center justify-between gap-2">
													<span className="flex items-center gap-2">
														{item.name}
														<Ariakit.TooltipProvider>
															<Ariakit.TooltipAnchor>
																<Icon
																	name={item.unlockType === 'linear' ? 'linear-unlock' : 'cliff-unlock'}
																	height={16}
																	width={16}
																	className="text-(--text-meta)"
																/>
															</Ariakit.TooltipAnchor>
															<Ariakit.Tooltip className="z-50 rounded-md bg-(--bg-secondary) px-2 py-1 text-xs">
																{item.unlockType === 'linear' ? 'Linear Unlock' : 'Cliff Unlock'}
															</Ariakit.Tooltip>
														</Ariakit.TooltipProvider>
													</span>
													<span className="font-medium">{usdValue ? formattedNum(usdValue, true) : '-'}</span>
												</span>
												<span className="flex items-center justify-between gap-2 text-xs text-(--text-meta)">
													<span>
														{percentage != null ? <>{formattedNum(percentage)}%</> : null}{' '}
														{percentageFloat != null ? <>({formattedNum(percentageFloat)}% of float)</> : null}
													</span>
													<span>
														{formattedNum(item.amount)} {impact.symbol}
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
										<span>
											{formattedNum(
												impact.unlockBreakdown.reduce((acc, item) => acc + item.amount * impact.price, 0),
												true
											)}
										</span>
									</span>
									<span className="flex items-center justify-between gap-2 text-xs text-(--text-meta)">
										<span>
											{impact.maxSupply &&
												`${formattedNum((impact.unlockBreakdown.reduce((acc, item) => acc + item.amount, 0) / impact.maxSupply) * 100)}%`}
											{impact.mcap &&
												` (${formattedNum(
													(impact.unlockBreakdown.reduce((acc, item) => acc + item.amount * impact.price, 0) /
														impact.mcap) *
														100
												)}% of float)`}
										</span>
										<span>
											{formattedNum(impact.unlockBreakdown.reduce((acc, item) => acc + item.amount, 0))} {impact.symbol}
										</span>
									</span>
								</span>
							</Ariakit.Hovercard>
						</Ariakit.HovercardProvider>
					</div>
				</div>
			))}
		</div>
	)
}
