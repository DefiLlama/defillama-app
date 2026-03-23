import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (context) => {
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
