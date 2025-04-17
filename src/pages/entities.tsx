import * as React from 'react'
import { withPerformanceLogging } from '~/utils/perf'
import { Treasuries } from '~/containers/Treasuries'
import { maxAgeForNext } from '~/api'
import { getEntitiesData } from '~/containers/Treasuries/queries'

export const getStaticProps = withPerformanceLogging('entities', async () => {
	const data = await getEntitiesData()
	return { props: { data, entity: true }, revalidate: maxAgeForNext([22]) }
})

export default function Entities(props) {
	return <Treasuries {...props} />
}
