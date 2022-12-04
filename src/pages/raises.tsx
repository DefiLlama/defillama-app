import * as React from 'react'
import { revalidate } from '~/api'
import { getRaisesFiltersList } from '~/api/categories/raises'
import { RAISES_API } from '~/constants'
import RaisesContainer from '~/containers/Raises'
import { toYearMonth } from '~/utils'
import { compressPageProps, decompressPageProps } from '~/utils/compress'

export async function getStaticProps() {
	const data = await fetch(RAISES_API).then((r) => r.json())

	const monthlyInvestment = {}

	data.raises.forEach((r) => {
		const monthlyDate = toYearMonth(r.date)
		monthlyInvestment[monthlyDate] = (monthlyInvestment[monthlyDate] ?? 0) + r.amount
	})

	const filters = getRaisesFiltersList(data)

	const compressed = compressPageProps({
		raises: data.raises,
		monthlyInvestment: Object.entries(monthlyInvestment).map((t) => [
			new Date(t[0]).getTime() / 1e3,
			Number.isNaN(Number(t[1])) ? 0 : Number(t[1]) * 1e6
		]),
		...filters
	})

	return {
		props: { compressed },
		revalidate: revalidate()
	}
}

const Raises = ({ compressed }) => {
	const props = decompressPageProps(compressed)

	return <RaisesContainer {...props} investorName={null} />
}

export default Raises
