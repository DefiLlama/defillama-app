import { DashGrid } from '~/pages/press'
import { Divider, Panel } from '..'
import { TYPE } from '~/Theme'

export const FAQ = () => (
	<Panel style={{ marginTop: '6px', maxWidth: '600px', margin: '0 auto' }}>
		<DashGrid style={{ height: 'fit-content', padding: '0 0 0.25rem 0', marginTop: '8px', gridGap: '8px' }}>
			<div style={{ paddingBottom: '8px' }}>
				<TYPE.heading>Correlation</TYPE.heading>
				Positively correlated variables tend to move together, negatively correlated variables move inversely to each
				other, and uncorrelated variables move independently of each other.
			</div>
			<div style={{ paddingBottom: '8px' }}>
				<TYPE.heading>Pearson Correlation Coefficient</TYPE.heading>
				The Pearson Correlation Coefficient quantifies the estimated strength of the linear association between two
				variables. It ranges from +1 to -1: +1 indicates a perfect positive linear correlation, -1 a perfect negative
				linear correlation, 0 indicates no linear correlation.
			</div>
			<Divider />
			<div style={{ paddingBottom: '8px' }}>
				<TYPE.heading>Positive Value</TYPE.heading>A positive value indicates a positive correlation between two
				variables.
			</div>
			<div style={{ paddingBottom: '8px' }}>
				<TYPE.heading>Negative Value</TYPE.heading>A negative value indicates a negative correlation between two
				variables.
			</div>
			<div style={{ paddingBottom: '8px' }}>
				<TYPE.heading>Zero</TYPE.heading> A value of 0 indicates no correlation between two variables.
			</div>
		</DashGrid>
	</Panel>
)
