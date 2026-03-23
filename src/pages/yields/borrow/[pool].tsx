import type { GetServerSideProps } from 'next'
import Layout from '~/layout'

export const getServerSideProps: GetServerSideProps = async (context) => {
	return Promise.resolve({
		redirect: {
			destination: `/yields/pool/${context.params?.pool}`,
			permanent: true
		}
	})
}

export default function YieldPoolPage() {
	return (
		<Layout
			title={`DeFi Yield Pool Chart & Analytics - DefiLlama`}
			description={null}
			canonicalUrl={null}
			noIndex={true}
		>
			<></>
		</Layout>
	)
}
