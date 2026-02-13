import { formattedNum } from '~/utils'

export const BreakdownTooltipContent = ({
	breakdown,
	description
}: {
	breakdown: Array<[string, number]>
	description: string
}) => (
	<span className="flex flex-col gap-1">
		<span className="text-sm text-(--text-meta)">{description}</span>
		{breakdown.map(([chain, tvl]) => (
			<span key={`${chain}-${tvl}`}>
				{chain}: {formattedNum(tvl, true)}
			</span>
		))}
	</span>
)
