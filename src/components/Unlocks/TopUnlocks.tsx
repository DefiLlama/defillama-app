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
		<div className={`bg-(--cards-bg) border border-(--cards-border) rounded-md p-1 flex flex-col gap-0.5 ${className}`}>
			<Tooltip
				className="text-lg font-semibold mb-1"
				content={`List of top unlocks in the last ${period} ${period === 1 ? 'day' : 'days'}`}
			>
				{title}
			</Tooltip>
			<div className="flex flex-col gap-2">
				{topUnlocks.map((unlock, i) => (
					<div key={unlock.name} className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<TokenLogo logo={tokenIconUrl(`${unlock.name}`)} />
							<BasicLink
								href={`/unlocks/${slug(unlock.name)}`}
								className="overflow-hidden text-(--bg-2) whitespace-nowrap font-medium text-lg text-ellipsis hover:underline"
							>
								{unlock.name} ({unlock.symbol})
							</BasicLink>
						</div>
						<span className="text-blue-400 font-medium text-sm">{formattedNum(unlock.value, true)}</span>
					</div>
				))}
			</div>
		</div>
	)
}
