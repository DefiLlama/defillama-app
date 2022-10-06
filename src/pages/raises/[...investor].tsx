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
	const investors = new Set<string>()

	data.raises.forEach((r) => {
		let toFilter = false

		r.leadInvestors.forEach((inv) => {
			investors.add(inv)

			if (!toFilter) {
				toFilter = slug(inv.toLowerCase()) === name
			}
		})

		r.otherInvestors.forEach((inv) => {
			investors.add(inv)

			if (!toFilter) {
				toFilter = slug(inv.toLowerCase()) === name
			}
		})

		if (toFilter) {
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
			})),
			investors: Array.from(investors)
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
