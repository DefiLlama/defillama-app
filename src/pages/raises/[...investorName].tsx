import * as React from 'react'
import { revalidate } from '~/api'
import { getRaisesFiltersList } from '~/api/categories/raises'
import { RAISES_API } from '~/constants'
import RaisesContainer from '~/containers/Raises'
import { slug } from '~/utils'

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

	const filters = getRaisesFiltersList({ raises })

	return {
		props: {
			raises,
			...filters,
			investorName
		},
		revalidate: revalidate()
	}
}

export async function getStaticPaths() {
	const data = await fetch(RAISES_API).then((r) => r.json())

	const { investors } = getRaisesFiltersList(data)

	return { paths: investors.map((i) => ({ params: { investorName: [slug(i.toLowerCase())] } })), fallback: 'blocking' }
}

const Raises = (props) => {
	return <RaisesContainer {...props} />
}

export default Raises
