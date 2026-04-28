import type { GetServerSideProps } from 'next'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/protocol/fees/${context.params?.item}`,
			permanent: true
		}
	})
}

export default function Fees() {
	return <div>Fees</div>
}

export const getServerSideProps = withServerSidePropsTelemetry('/fees/[item]', getServerSidePropsHandler)
