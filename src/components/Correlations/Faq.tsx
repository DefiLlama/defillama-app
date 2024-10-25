import { Panel } from '..'

export const FAQ = () => (
	<Panel className="mx-auto max-w-xl flex flex-col gap-4">
		<div className="flex flex-col gap-1">
			<h2 className="font-semibold text-lg">Correlation</h2>
			Positively correlated variables tend to move together, negatively correlated variables move inversely to each
			other, and uncorrelated variables move independently of each other.
		</div>
		<div className="flex flex-col gap-1">
			<h2 className="font-semibold text-lg">Pearson Correlation Coefficient</h2>
			<p>
				The Pearson Correlation Coefficient quantifies the estimated strength of the linear association between two
				variables. It ranges from +1 to -1: +1 indicates a perfect positive linear correlation, -1 a perfect negative
				linear correlation, 0 indicates no linear correlation.
			</p>
		</div>
		<hr className="border-black/20 dark:border-white/20" />
		<div className="flex flex-col gap-1">
			<h2 className="font-semibold text-lg">Positive Value</h2>
			<p>A positive value indicates a positive correlation between two variables.</p>
		</div>
		<div className="flex flex-col gap-1">
			<h2 className="font-semibold text-lg">Negative Value</h2>
			<p>A negative value indicates a negative correlation between two variables.</p>
		</div>
		<div className="flex flex-col gap-1">
			<h2 className="font-semibold text-lg">Zero</h2>
			<p>A value of 0 indicates no correlation between two variables.</p>
		</div>
	</Panel>
)
