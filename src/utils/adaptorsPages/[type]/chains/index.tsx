import { maxAgeForNext } from '~/api'
import { getChainsPageData } from '~/api/categories/adaptors'

async function getStaticProps({ params }) {
	const data = await getChainsPageData(params.type)
	if (params.type === 'options') {
		const premiumData = await getChainsPageData(params.type, 'dailyPremiumVolume')
		data.premium = premiumData
	}
	return {
		props: data,
		revalidate: maxAgeForNext([22])
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
