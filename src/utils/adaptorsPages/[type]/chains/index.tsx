import { expiresForNext, maxAgeForNext } from '~/api'
import { getChainsPageData } from '~/api/categories/adaptors'

async function getStaticProps({ params }) {
	const data = await getChainsPageData(params.type)
	return {
		props: data,
		revalidate: maxAgeForNext([22]),
		expires: expiresForNext([22])
	}
}

export const getStaticPropsByType = (type: string) => (context) =>
	getStaticProps({
		...context,
		params: {
			...context.params,
			type
		}
	})

export { default } from '..'
