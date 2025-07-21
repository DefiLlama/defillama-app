import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (context) => {
	return {
		redirect: {
			destination: `/protocol/options/${context.params?.item}`,
			permanent: true
		}
	}
}

export default function NotionalVolume() {
	return <div>NotionalVolume</div>
}
