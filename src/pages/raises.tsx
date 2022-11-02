import * as React from 'react'
import { revalidate } from '~/api'
import { getRaisesFiltersList } from '~/api/categories/raises'
import { RAISES_API } from '~/constants'
import RaisesContainer from '~/containers/Raises'
import { toYearMonth } from '~/utils'

export async function getStaticProps() {
	const data = await fetch(RAISES_API).then((r) => r.json())

	const monthlyInvestment = {}
	data.raises.forEach((r) => {
		const monthlyDate = toYearMonth(r.date)
		monthlyInvestment[monthlyDate] = (monthlyInvestment[monthlyDate] ?? 0) + r.amount
	})

	const filters = getRaisesFiltersList(data)

	return {
		props: {
			raises: data.raises,
      monthlyInvestment,
			...filters
		},
		revalidate: revalidate()
	}
}

const Raises = (props) => {
	return <RaisesContainer {...props} investorName={null} />
}

export default Raises
