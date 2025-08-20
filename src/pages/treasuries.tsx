import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { Treasuries } from '~/containers/Treasuries'
import { getTreasuryData } from '~/containers/Treasuries/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('treasuries', async () => {
	const data = await getTreasuryData()

	return { props: { data, entity: false }, revalidate: maxAgeForNext([22]) }
})

export default function TreasuriesPage(props) {
	return <Treasuries {...props} />
}
