import * as React from 'react'
import { revalidate } from '~/api'
import HacksContainer from '~/containers/Hacks'
import { toYearMonth } from '~/utils'

export async function getStaticProps() {
	const data = (await fetch("https://defi-hacks-api.herokuapp.com/").then((r) => r.json())).map(h=>({
		chains: h.chain,
		classification: h.classification,
		date: h.date/1e3,
		amount: h.funds_lost/1e6,
		name: h.name,
		technique: h.technique,
	}))

	const monthlyHacks = {}

	data.forEach((r) => {
		const monthlyDate = toYearMonth(r.date)
		monthlyHacks[monthlyDate] = (monthlyHacks[monthlyDate] ?? 0) + r.amount
	})

	return {
		props: {
			data,
			monthlyHacks
		},
		revalidate: revalidate()
	}
}

const Raises = ({ data, monthlyHacks }) => {
	return <HacksContainer data={data} monthlyHacks={monthlyHacks} />
}

export default Raises
