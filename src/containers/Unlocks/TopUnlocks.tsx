import * as React from 'react'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import type { ProtocolEmissionWithHistory } from './types'

interface TopUnlocksProps {
	data: ProtocolEmissionWithHistory[]
	period: number
	title?: string
	className?: string
	initialNowSec?: number
}

export const TopUnlocks: React.FC<TopUnlocksProps> = ({ data, period, title, className, initialNowSec }) => {
	const [now] = React.useState(() =>
		typeof initialNowSec === 'number' && Number.isFinite(initialNowSec)
			? Math.floor(initialNowSec)
			: Math.floor(Date.now() / 1000)
	)
	const { topUnlocks } = React.useMemo(() => {
		const protocolUnlocks = new Map<
			string,
			{
				name: string
				symbol: string
				value: number
			}
		>()
		const startTime = now - period * 24 * 60 * 60

		if (data) {
			for (const protocol of data) {
				const timestampGroups = new Map<number, number>()

				if (protocol.events) {
					for (const event of protocol.events) {
						if (event.timestamp >= startTime && event.timestamp <= now) {
							const totalTokens = event.noOfTokens?.reduce((sum: number, amount: number) => sum + amount, 0) || 0
							const existing = timestampGroups.get(event.timestamp) || 0
							timestampGroups.set(event.timestamp, existing + totalTokens)
						}
					}
				}

				const totalUnlockValue = Array.from(timestampGroups.values()).reduce(
					(sum, tokens) => sum + tokens * (protocol.tPrice ?? 0),
					0
				)

				if (totalUnlockValue > 0) {
					protocolUnlocks.set(protocol.name, {
						name: protocol.name,
						symbol: protocol.tSymbol ?? '',
						value: totalUnlockValue
					})
				}
			}
		}

		return {
			topUnlocks: Array.from(protocolUnlocks.values())
				.sort((a, b) => b.value - a.value)
				.slice(0, 3)
		}
	}, [data, period, now])

	return (
		<div className={`text-(--text-primary) ${className ?? ''}`}>
			<Tooltip
				className="text-base font-semibold text-(--text-primary)"
				content={`List of top unlocks in the last ${period} ${period === 1 ? 'day' : 'days'}`}
			>
				{title}
			</Tooltip>

			{topUnlocks.map((unlock) => (
				<div key={unlock.name} className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TokenLogo logo={tokenIconUrl(`${unlock.name}`)} />
						<BasicLink
							href={`/unlocks/${slug(unlock.name)}`}
							className="overflow-hidden text-ellipsis whitespace-nowrap text-(--text-primary) hover:underline"
						>
							{unlock.name} ({unlock.symbol})
						</BasicLink>
					</div>
					<span className="text-sm font-semibold text-(--link-text) tabular-nums">
						{formattedNum(unlock.value, true)}
					</span>
				</div>
			))}
		</div>
	)
}
