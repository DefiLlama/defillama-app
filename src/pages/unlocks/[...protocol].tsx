import { maxAgeForNext } from '~/api'
import { getProtocolEmissons } from '~/api/categories/protocols'
import { Emissions } from '~/containers/Defi/Protocol/Emissions/index'
import * as React from 'react'
import Layout from '~/layout'
import styled from 'styled-components'
import { StatsSection } from '~/layout/Stats/Medium'
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
			<Wrapper>
				<Emissions data={emissions} isEmissionsPage />
			</Wrapper>
		</Layout>
	)
}

export const Wrapper = styled(StatsSection)`
	display: flex;
	flex-direction: column;
	gap: 36px;
	padding: 24px;
	color: ${({ theme }) => theme.text1};
	background: ${({ theme }) => theme.bg7};
`
