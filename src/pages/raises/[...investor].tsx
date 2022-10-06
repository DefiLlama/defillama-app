import * as React from 'react'
import { revalidate } from '~/api'
import RaisesContainer from '~/containers/Raises'
import { slug } from '~/utils'

export async function getStaticProps({
	params: {
		investor: [name]
	}
}) {
	const data = await fetch(`https://api.llama.fi/raises`).then((r) => r.json())

	const raises = []

	data.raises.forEach((r) => {
		const lead = r.leadInvestors.find((l) => slug(l.toLowerCase()) === name)

		const other = r.otherInvestors.find((o) => slug(o.toLowerCase()) === name)

		if (lead || other) {
			raises.push(r)
		}
	})

	if (raises.length === 0) {
		return {
			notFound: true
		}
	}

	return {
		props: {
			raises: raises.map((r) => ({
				...r,
				lead: r.leadInvestors.join(', '),
				otherInvestors: r.otherInvestors.join(', ')
			}))
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	const data = await fetch(`https://api.llama.fi/raises`).then((r) => r.json())

	const investors = new Set<string>()

	data.raises.forEach((r) => {
		r.leadInvestors.forEach((x: string) => {
			investors.add(x.toLowerCase())
		})

		r.otherInvestors.forEach((x: string) => {
			investors.add(x.toLowerCase())
		})
	})

	return { paths: Array.from(investors).map((i) => ({ params: { investor: [slug(i)] } })), fallback: 'blocking' }
}

const Raises = ({ raises }) => {
	return <RaisesContainer raises={raises} />
}

export default Raises
