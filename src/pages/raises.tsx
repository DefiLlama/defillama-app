import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getRaisesFiltersList } from '~/api/categories/raises'
import { RAISES_API } from '~/constants'
import RaisesContainer from '~/containers/Raises'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('raises', async () => {
	const data = await fetchJson(RAISES_API)

	const filters = getRaisesFiltersList(data)

	return {
		props: {
			raises: data.raises,
			...filters
		},
		revalidate: maxAgeForNext([22])
	}
})

const Raises = (props) => {
	return <RaisesContainer {...props} investorName={null} />
}

export default Raises
