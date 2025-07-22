import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (context) => {
	return {
		redirect: {
			destination: `/protocol/bridge-aggregators/${context.params?.item}`,
			permanent: true
		}
	}
}

export default function BridgeAggregator() {
	return <div>BridgeAggregator</div>
}
