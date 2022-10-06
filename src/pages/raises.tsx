import * as React from 'react'
import { revalidate } from '~/api'
import RaisesContainer from '~/containers/Raises'

export async function getStaticProps() {
	const data = await fetch(`https://api.llama.fi/raises`).then((r) => r.json())

	return {
		props: {
			raises: data.raises.map((r) => ({
				...r,
				lead: r.leadInvestors.join(', '),
				otherInvestors: r.otherInvestors.join(', ')
			}))
		},
		revalidate: revalidate()
	}
}

const Raises = ({ raises }) => {
	return <RaisesContainer raises={raises} />
}

export default Raises
