import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (context) => {
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
