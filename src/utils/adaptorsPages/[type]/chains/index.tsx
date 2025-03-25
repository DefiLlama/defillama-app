import { maxAgeForNext } from '~/api'
import { getDimensionsAdaptersChainsPageData } from '~/api/categories/adaptors'

async function getStaticProps({ params }) {
	const data = await getDimensionsAdaptersChainsPageData(params.type)
	if (params.type === 'options') {
		const premiumData = await getDimensionsAdaptersChainsPageData(params.type, 'dailyPremiumVolume')
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
