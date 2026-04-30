import type { GetServerSideProps } from 'next'
import Layout from '~/layout'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/yields/pool/${context.params?.pool}`,
			permanent: true
		}
	})
}

export default function YieldPoolPage() {
	return (
		<Layout
			title={`DeFi Yield Pool Chart & Analytics - DefiLlama`}
			description={null}
			canonicalUrl={null}
			noIndex={true}
		>
			<></>
		</Layout>
	)
}

export const getServerSideProps = withServerSidePropsTelemetry('/yields/borrow/[pool]', getServerSidePropsHandler)
