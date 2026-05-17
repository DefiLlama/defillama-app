import type { GetServerSideProps } from 'next'
import { withServerSidePropsTelemetry } from '~/utils/telemetry'

const getServerSidePropsHandler: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/protocol/dexs/${context.params?.item}`,
			permanent: true
		}
	})
}

export default function Dex() {
	return <div>Dex</div>
}

export const getServerSideProps = withServerSidePropsTelemetry('/dexs/[item]', getServerSidePropsHandler)
