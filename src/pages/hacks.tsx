import * as React from 'react'
import { expiresForNext, maxAgeForNext } from '~/api'
import HacksContainer from '~/containers/Hacks'
import { formattedNum, toYearMonth } from '~/utils'

export async function getStaticProps() {
	const data = (await fetch('https://defi-hacks-api.herokuapp.com/').then((r) => r.json())).map((h) => ({
		chains: h.chain,
		classification: h.classification,
		date: h.date / 1e3,
		target: h.target_type,
		amount: h.funds_lost / 1e6,
		name: h.name,
		technique: h.technique,
		bridge: h.bridge_multichain_application,
		link: h.link
	}))

	const monthlyHacks = {}

	data.forEach((r) => {
		const monthlyDate = toYearMonth(r.date)
		monthlyHacks[monthlyDate] = (monthlyHacks[monthlyDate] ?? 0) + r.amount
	})

	const totalHacked = formattedNum(
		data.map((hack) => hack.amount).reduce((acc, amount) => acc + amount, 0) / 1000,
		true
	)

	const totalHackedDefi = formattedNum(
		data
			.filter((hack) => hack.target == 'DeFi Protocol')
			.map((hack) => hack.amount)
			.reduce((acc, amount) => acc + amount, 0) / 1000,
		true
	)

	const totalRugs = formattedNum(
		data
			.filter((hack) => hack.bridge === true)
			.map((hack) => hack.amount)
			.reduce((acc, amount) => acc + amount, 0) / 1000,
		true
	)

	return {
		props: {
			data,
			monthlyHacks,
			totalHacked,
			totalHackedDefi,
			totalRugs
		},
		revalidate: maxAgeForNext([22]),
		expires: expiresForNext([22])
	}
}

const Raises = ({ data, monthlyHacks, ...props }) => {
	return <HacksContainer data={data} monthlyHacks={monthlyHacks} {...(props as any)} />
}

export default Raises
