import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (context) => {
	return {
		redirect: {
			destination: `/protocol/fees/${context.params?.item}`,
			permanent: true
		}
	}
}
