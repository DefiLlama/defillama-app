import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { RAISES_API } from '~/constants'
import { InvestorContainer } from '~/containers/Raises/Investor'
import { getRaisesFiltersList } from '~/containers/Raises/utils'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'raises/[...investorName]',
	async ({
		params: {
			investorName: [name]
		}
	}) => {
		const data = await fetchJson(RAISES_API)

		const raises = []

		let investorName = null

		for (const raise of data.raises) {
			let isInvestor = false

			for (const leadInvestor of raise.leadInvestors ?? []) {
				if (slug(leadInvestor.toLowerCase()) === name) {
					investorName = leadInvestor
					isInvestor = true
				}
			}

			for (const otherInvestor of raise.otherInvestors ?? []) {
				if (slug(otherInvestor.toLowerCase()) === name) {
					investorName = otherInvestor
					isInvestor = true
				}
			}

			if (isInvestor) {
				raises.push(raise)
			}
		}

		if (raises.length === 0) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
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
