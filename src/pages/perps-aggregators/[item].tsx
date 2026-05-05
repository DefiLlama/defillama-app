import type { GetServerSideProps } from 'next'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/protocol/perps-aggregators/${context.params?.item}`,
			permanent: true
		}
	})
}

export default function PerpsAggregator() {
	return <div>PerpsAggregator</div>
}

export const getServerSideProps = withServerSidePropsTelemetry('/perps-aggregators/[item]', getServerSidePropsHandler)
