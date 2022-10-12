import * as React from 'react'
import { revalidate } from '~/api'
import { getInvestorsList } from '~/api/categories/raises'
import { RAISES_API } from '~/constants'
import RaisesContainer from '~/containers/Raises'

export async function getStaticProps() {
	const data = await fetch(RAISES_API).then((r) => r.json())

	return {
		props: {
			raises: data.raises,
			investors: getInvestorsList(data)
		},
		revalidate: revalidate()
	}
}

const Raises = (props) => {
	return <RaisesContainer {...props} investorName={null} />
}

export default Raises
