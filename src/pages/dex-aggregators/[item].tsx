import type { GetServerSideProps } from 'next'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/protocol/dex-aggregators/${context.params?.item}`,
			permanent: true
		}
	})
}

export default function DexAggregator() {
	return <div>DexAggregator</div>
}

export const getServerSideProps = withServerSidePropsTelemetry('/dex-aggregators/[item]', getServerSidePropsHandler)
