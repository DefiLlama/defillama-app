import * as React from 'react'
import { maxAgeForNext } from '~/api'
import HacksContainer from '~/containers/Hacks'
import { formattedNum } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchJson } from '~/utils/async'
import { HACKS_API } from '~/constants'

export const getStaticProps = withPerformanceLogging('hacks', async () => {
	const data = (await fetchJson(HACKS_API)).map((h) => ({
		chains: h.chain ?? [],
		classification: h.classification,
		date: h.date,
		target: h.targetType,
		amount: h.amount / 1e6,
		name: h.name,
		technique: h.technique,
		bridge: h.bridgeHack,
		link: h.source ?? '',
		language: h.language ?? ''
	}))

	const monthlyHacks = {}

	data.forEach((hack) => {
		const monthlyDate = getFirstDateOfTheMonth(hack.date)
		monthlyHacks[monthlyDate] = (monthlyHacks[monthlyDate] ?? 0) + hack.amount * 1e6
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
			found.value += obj.value * 1e6
		} else {
			acc.push({ ...obj, value: obj.value * 1e6 })
		}
		return acc
	}

	const groupedHacks = onlyHacksTechnique.reduce(sumDuplicates, []).toSorted((a, b) => b.value - a.value)

	const othersValue = groupedHacks.slice(15).reduce((total, entry) => total + entry.value, 0)

	const pieChartData = [...groupedHacks.slice(0, 15), { name: 'Others', value: othersValue }]

	return {
		props: {
			data,
			monthlyHacks: Object.entries(monthlyHacks),
			totalHacked,
			totalHackedDefi,
			totalRugs,
			pieChartData
		},
		revalidate: maxAgeForNext([22])
	}
})

const Hacks = (props) => {
	const monthlyHacks = React.useMemo(() => {
		return props.monthlyHacks.map((m) => [getFirstDateOfTheMonth(m[0]), m[1]])
	}, [props.monthlyHacks])
	return <HacksContainer {...props} monthlyHacks={monthlyHacks} />
}

export default Hacks

function getFirstDateOfTheMonth(currentDate) {
	const date = new Date(currentDate * 1000)
	return new Date(date.getUTCFullYear(), date.getUTCMonth(), 1).getTime() / 1e3
}
