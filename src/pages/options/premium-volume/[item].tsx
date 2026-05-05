import type { GetServerSideProps } from 'next'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/protocol/options/${context.params?.item}`,
			permanent: true
		}
	})
}

export default function PremiumVolume() {
	return <div>PremiumVolume</div>
}

export const getServerSideProps = withServerSidePropsTelemetry(
	'/options/premium-volume/[item]',
	getServerSidePropsHandler
)
