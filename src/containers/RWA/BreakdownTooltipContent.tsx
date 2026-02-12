import { formattedNum } from '~/utils'

export const BreakdownTooltipContent = ({ breakdown }: { breakdown: Array<[string, number]> }) => (
	<span className="flex flex-col gap-1">
		{breakdown.map(([chain, tvl]) => (
			<span key={`${chain}-${tvl}`}>
				{chain}: {formattedNum(tvl, true)}
			</span>
		))}
	</span>
)
