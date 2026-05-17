import type { GetServerSideProps } from 'next'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/protocol/perps/${context.params?.item}`,
			permanent: true
		}
	})
}

export default function Perps() {
	return <div>Perps</div>
}

export const getServerSideProps = withServerSidePropsTelemetry('/perps/[item]', getServerSidePropsHandler)
