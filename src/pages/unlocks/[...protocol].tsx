import { maxAgeForNext } from '~/api'
import { getProtocolEmissons } from '~/api/categories/protocols'
import { Emissions } from '~/containers/ProtocolOverview/Emissions/index'
import * as React from 'react'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'unlocks/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const emissions = await getProtocolEmissons(protocol)

		if (emissions.chartData?.documented?.length === 0 && emissions.chartData?.realtime?.length === 0) {
			return {
				notFound: true
			}
		}

		return {
			props: {
				emissions
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocol({ emissions }) {
	return (
		<Layout title={`${emissions.name} Unlocks - DefiLlama`} defaultSEO>
			<Emissions data={emissions} isEmissionsPage />
		</Layout>
	)
}
