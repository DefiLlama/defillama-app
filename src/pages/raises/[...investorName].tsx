import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getRaisesFiltersList } from '~/api/categories/raises'
import { RAISES_API } from '~/constants'
import RaisesContainer from '~/containers/Raises'
import { slug, toYearMonth } from '~/utils'

export async function getStaticProps({
	params: {
		investorName: [name]
	}
}) {
	const data = await fetch(RAISES_API).then((r) => r.json())

	const raises = []

	let investorName = null

	data.raises.forEach((r) => {
		let isInvestor = false

		r.leadInvestors?.forEach((l) => {
			if (slug(l.toLowerCase()) === name) {
				investorName = l
				isInvestor = true
			}
		})

		r.otherInvestors?.forEach((l) => {
			if (slug(l.toLowerCase()) === name) {
				investorName = l
				isInvestor = true
			}
		})

		if (isInvestor) {
			raises.push(r)
		}
	})

	if (raises.length === 0) {
		return {
			notFound: true
		}
	}

	const monthlyInvestment = {}

	raises.forEach((r) => {
		// split EOS raised amount between 13 months
		if (r.name === 'EOS') {
			for (let month = 0; month < 13; month++) {
				const date = toYearMonth(r.date - month * 2_529_746)
				monthlyInvestment[date] = (monthlyInvestment[date] ?? 0) + (r.amount ?? 0) / 13
			}
		} else {
			const monthlyDate = toYearMonth(r.date)

			monthlyInvestment[monthlyDate] = (monthlyInvestment[monthlyDate] ?? 0) + (r.amount ?? 0)
		}
	})

	const filters = getRaisesFiltersList({ raises })

	return {
		props: {
			raises,
			monthlyInvestment: Object.entries(monthlyInvestment).map((t) => [
				new Date(t[0]).getTime() / 1e3,
				Number.isNaN(Number(t[1])) ? 0 : Number(t[1]) * 1e6
			]),
			...filters,
			investorName
		},
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	return {
		paths: [],
		fallback: 'blocking'
	}
}

const Raises = (props) => {
	return <RaisesContainer {...props} />
}

export default Raises
