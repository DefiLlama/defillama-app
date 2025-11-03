import * as React from 'react'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { BasicLink } from '../Link'
import { TokenLogo } from '../TokenLogo'
import { Tooltip } from '../Tooltip'

interface TopUnlocksProps {
	data: any[]
	period: number
	title?: string
	className?: string
}

export const TopUnlocks: React.FC<TopUnlocksProps> = ({ data, period, title, className }) => {
	const { topUnlocks } = React.useMemo(() => {
		const protocolUnlocks = new Map<
			string,
			{
				name: string
				symbol: string
				value: number
			}
		>()

		const now = Date.now() / 1000
		const startTime = now - period * 24 * 60 * 60

		data?.forEach((protocol) => {
			const timestampGroups = new Map<number, number>()

			protocol.events?.forEach((event) => {
				if (event.timestamp >= startTime && event.timestamp <= now) {
					const totalTokens = event.noOfTokens?.reduce((sum, amount) => sum + amount, 0) || 0
					const existing = timestampGroups.get(event.timestamp) || 0
					timestampGroups.set(event.timestamp, existing + totalTokens)
				}
			})

			const totalUnlockValue = Array.from(timestampGroups.values()).reduce(
				(sum, tokens) => sum + tokens * protocol.tPrice,
				0
			)

			if (totalUnlockValue > 0) {
				protocolUnlocks.set(protocol.name, {
					name: protocol.name,
					symbol: protocol.tSymbol,
					value: totalUnlockValue
				})
			}
		})

		return {
			topUnlocks: Array.from(protocolUnlocks.values())
				.sort((a, b) => b.value - a.value)
				.slice(0, 3)
		}
	}, [data, period])

	return (
		<div className={className}>
			<Tooltip
				className="text-base font-semibold"
				content={`List of top unlocks in the last ${period} ${period === 1 ? 'day' : 'days'}`}
			>
				{title}
			</Tooltip>

			{topUnlocks.map((unlock, i) => (
				<div key={unlock.name} className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TokenLogo logo={tokenIconUrl(`${unlock.name}`)} />
						<BasicLink
							href={`/unlocks/${slug(unlock.name)}`}
							className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline"
						>
							{unlock.name} ({unlock.symbol})
						</BasicLink>
					</div>
					<span className="text-sm font-medium text-(--primary)">{formattedNum(unlock.value, true)}</span>
				</div>
			))}
		</div>
	)
}
