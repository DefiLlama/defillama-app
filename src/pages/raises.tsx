import * as React from 'react'
import { revalidate } from '~/api'
import { RAISES_API } from '~/constants'
import RaisesContainer from '~/containers/Raises'
import { toYearMonth } from '~/utils'

export async function getStaticProps() {
	const data = await fetch(RAISES_API).then((r) => r.json())

	const investors = new Set<string>()
	const monthlyInvestment = {}

	data.raises.forEach((r) => {
		r.leadInvestors.forEach((x: string) => {
			investors.add(x.toLowerCase())
		})

		r.otherInvestors.forEach((x: string) => {
			investors.add(x.toLowerCase())
		})

		const monthlyDate = toYearMonth(r.date)
		monthlyInvestment[monthlyDate] = (monthlyInvestment[monthlyDate] ?? 0) + r.amount
	})

	return {
		props: {
			raises: data.raises.map((r) => ({
				...r,
				lead: r.leadInvestors.join(', '),
				otherInvestors: r.otherInvestors.join(', ')
			})),
			investors: Array.from(investors),
			monthlyInvestment
		},
		revalidate: revalidate()
	}
}

const Raises = ({ raises, monthlyInvestment }) => {
	return <RaisesContainer raises={raises} investorName={null} monthlyInvestment={monthlyInvestment} />
}

export default Raises
