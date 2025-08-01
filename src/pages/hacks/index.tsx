import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { HacksContainer } from '~/containers/Hacks'
import { withPerformanceLogging } from '~/utils/perf'
import { getHacksPageData } from '~/containers/Hacks/queries'

export const getStaticProps = withPerformanceLogging('hacks', async () => {
	const data = await getHacksPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function Hacks(props) {
	return <HacksContainer {...props} />
}
