import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (context) => {
	return {
		redirect: {
			destination: `/protocol/perps-aggregators/${context.params?.item}`,
			permanent: true
		}
	}
}

export default function PerpsAggregator() {
	return <div>PerpsAggregator</div>
}
