import { GetServerSideProps } from 'next'
import * as React from 'react'
import { addMaxAgeHeaderForNext } from '~/api'
import HacksContainer from '~/containers/Hacks'
import { formattedNum, toYearMonth } from '~/utils'

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
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
		}
	}
}

const Raises = ({ data, monthlyHacks, ...props }) => {
	return <HacksContainer data={data} monthlyHacks={monthlyHacks} {...(props as any)} />
}

export default Raises
