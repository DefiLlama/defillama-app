import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (context) => {
	return {
		redirect: {
			destination: `/protocol/perps-aggregators/${context.params?.item}`,
			permanent: true
		}
	}
}
