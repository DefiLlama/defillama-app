import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getRaisesFiltersList } from '~/api/categories/raises'
import { RAISES_API } from '~/constants'
import { InvestorContainer } from '~/containers/Raises/Investor'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'raises/[...investorName]',
	async ({
		params: {
			investorName: [name]
		}
	}) => {
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
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return {
		paths: [],
		fallback: 'blocking'
	}
}

const Raises = (props) => {
	return <InvestorContainer {...props} />
}

export default Raises
