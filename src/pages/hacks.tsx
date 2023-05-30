import * as React from 'react'
import { maxAgeForNext } from '~/api'
import HacksContainer from '~/containers/Hacks'
import { formattedNum, toYearMonth } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('hacks', async () => {
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

	const onlyHacksTechnique = data.map((hack) => ({
		name: hack.technique,
		value: hack.amount
	}))

	const sumDuplicates = (acc, obj) => {
		const found = acc.find((o) => o.name === obj.name)
		if (found) {
			found.value += obj.value
		} else {
			acc.push(obj)
		}
		return acc
	}

	const reducedData = onlyHacksTechnique.reduce(sumDuplicates, [])
	const othersValue = reducedData.slice(15).reduce((total, entry) => total + entry.value, 0)

	const pieChartData = [
		...reducedData.sort((a, b) => b.value - a.value).slice(0, 15),
		{ name: 'Others', value: othersValue }
	]

	return {
		props: {
			data,
			monthlyHacks,
			totalHacked,
			totalHackedDefi,
			totalRugs,
			pieChartData
		},
		revalidate: maxAgeForNext([22])
	}
})

const Raises = ({ data, monthlyHacks, ...props }) => {
	return <HacksContainer data={data} monthlyHacks={monthlyHacks} {...(props as any)} />
}

export default Raises
