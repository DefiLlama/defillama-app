import * as React from 'react'
import { TYPE } from '~/Theme'
import { Panel } from '~/components'
import { AutoColumn } from '~/components/Column'
import { RowBetween } from '~/components/Row'

const Section = ({ title, content }) => (
	<Panel>
		<AutoColumn gap="20px">
			<RowBetween>
				<TYPE.main>{title}</TYPE.main>
			</RowBetween>
			<RowBetween align="flex-end">
				<TYPE.main fontSize={'13px'} lineHeight={1} fontWeight={500}>
					{content}
				</TYPE.main>
			</RowBetween>
		</AutoColumn>
	</Panel>
)

export default Section
