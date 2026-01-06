import * as React from 'react'
import * as Ariakit from '@ariakit/react'
import dayjs from 'dayjs'
import { formattedNum, formattedPercent, slug, tokenIconUrl } from '~/utils'
import { Icon } from '../Icon'
import { BasicLink } from '../Link'
import { TokenLogo } from '../TokenLogo'
import { Tooltip } from '../Tooltip'

interface PastUnlockPriceImpactProps {
	data: any[]
	title?: string
	className?: string
}

interface UnlockBreakdown {
	name: string
	amount: number
	timestamp: number
	unlockType: string
}

export const PastUnlockPriceImpact: React.FC<PastUnlockPriceImpactProps> = ({ data, title, className }) => {
	const regex =
		/(?:of (.+?) tokens (?:will be|were) unlocked)|(?:will (?:increase|decrease) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})|(?:from (.+?) on {timestamp})|(?:was (?:increased|decreased) from \{tokens\[0\]\} to \{tokens\[1]\} tokens per week from (.+?) on {timestamp})/

	const parseDescription = (description: string): string => {
		const matches = description.match(regex)
		return matches?.[1] || matches?.[2] || matches?.[3] || matches?.[4] || ''
	}

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

		data?.forEach((protocol) => {
			if (!protocol.historicalPrice?.length || protocol.historicalPrice.length < 8 || !protocol.lastEvent?.length)
				return

			const now = Date.now() / 1000
			const thirtyDaysAgo = now - 30 * 24 * 60 * 60

			const lastEvents = protocol.lastEvent.filter((event) => event.timestamp >= thirtyDaysAgo)
			if (!lastEvents.length) return

			const eventsByTimestamp = lastEvents.reduce((acc, event) => {
				const totalTokens = event.noOfTokens?.reduce((sum, amount) => sum + amount, 0) || 0
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
			}, {})

			const latestTimestamp = Math.max(...Object.keys(eventsByTimestamp).map(Number))
			const latestEvent = eventsByTimestamp[latestTimestamp]

			const unlockValue = latestEvent.totalTokens * protocol.tPrice

			const priceAtUnlock = protocol.historicalPrice[7][1]
			const priceAfter7d = protocol.historicalPrice[protocol.historicalPrice.length - 1][1]
			const impact = ((priceAfter7d - priceAtUnlock) / priceAtUnlock) * 100

			const breakdown: UnlockBreakdown[] =
				latestEvent.events
					.flatMap((event) =>
						event.noOfTokens?.map((amount: number) => ({
							name: parseDescription(event.description),
							amount,
							timestamp: event.timestamp,
							unlockType: event.unlockType || 'cliff'
						}))
					)
					.filter(Boolean) || []

			protocolImpacts.set(protocol.name, {
				name: protocol.name,
				symbol: protocol.tSymbol,
				impact,
				value: unlockValue,
				timestamp: latestTimestamp,
				unlockBreakdown: breakdown,
				maxSupply: protocol.maxSupply,
				mcap: protocol.mcap,
				price: protocol.tPrice
			})
		})

		return {
			topImpacts: Array.from(protocolImpacts.values())
				.sort((a, b) => b.value - a.value)
				.slice(0, 3)
		}
	}, [data])

	return (
		<div className={className}>
			<Tooltip
				className="text-base font-semibold"
				content={`Price change 7 days after the most recent major unlock event, not counting non-circulating and farming emissions. Sorted by the value of the unlock event.`}
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
								className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline"
							>
								{impact.name} ({impact.symbol})
							</BasicLink>
						</div>
					</div>
					<div className="flex items-center gap-1">
						<span className={`text-sm font-medium ${impact.impact > 0 ? 'text-green-400' : 'text-red-400'}`}>
							{formattedPercent(impact.impact)}
						</span>
						<Ariakit.HovercardProvider>
							<Ariakit.HovercardAnchor>
								<Icon name="help-circle" width={16} height={16} className="cursor-help text-(--text-tertiary)" />
							</Ariakit.HovercardAnchor>
							<Ariakit.Hovercard
								className="z-10 flex flex-col gap-2 rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-4 dark:border-[hsl(204,3%,32%)] dark:bg-[#121316]"
								unmountOnHide
								portal={true}
							>
								<span className="flex items-center justify-between">
									<span className="flex items-center gap-2">
										<TokenLogo logo={tokenIconUrl(impact.name)} size={30} />
										{impact.symbol}
									</span>
									<span className="flex flex-col">
										<span>{dayjs(impact.timestamp * 1e3).format('MMM D, YYYY')}</span>
										<span className="text-sm text-(--text-tertiary)">
											{dayjs(impact.timestamp * 1e3).format('HH:mm')} GMT
											{dayjs(impact.timestamp * 1e3)
												.format('Z')
												.slice(0, 3)}
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
																	className="text-(--text-tertiary)"
																/>
															</Ariakit.TooltipAnchor>
															<Ariakit.Tooltip className="z-50 rounded-md bg-(--bg-secondary) px-2 py-1 text-sm">
																{item.unlockType === 'linear' ? 'Linear Unlock' : 'Cliff Unlock'}
															</Ariakit.Tooltip>
														</Ariakit.TooltipProvider>
													</span>
													<span>{usdValue ? formattedNum(usdValue, true) : '-'}</span>
												</span>
												<span className="flex items-center justify-between gap-2 text-(--text-tertiary)">
													<span>
														{percentage && formattedNum(percentage)}%{' '}
														{percentageFloat && <>({formattedNum(percentageFloat)}% of float)</>}
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
									<span className="flex items-center justify-between gap-2 text-(--text-tertiary)">
										<span>
											{impact.maxSupply &&
												`${formattedNum(
													(impact.unlockBreakdown.reduce((acc, item) => acc + item.amount, 0) / impact.maxSupply) * 100
												)}%`}
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
