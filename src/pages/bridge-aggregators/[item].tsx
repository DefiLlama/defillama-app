import type { GetServerSideProps } from 'next'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/protocol/bridge-aggregators/${context.params?.item}`,
			permanent: true
		}
	})
}

export default function BridgeAggregator() {
	return <div>BridgeAggregator</div>
}

export const getServerSideProps = withServerSidePropsTelemetry('/bridge-aggregators/[item]', getServerSidePropsHandler)
