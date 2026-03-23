import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/protocol/options/${context.params?.item}`,
			permanent: true
		}
	})
}

export default function NotionalVolume() {
	return <div>NotionalVolume</div>
}
