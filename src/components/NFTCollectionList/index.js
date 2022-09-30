import { useState, useMemo, useEffect } from 'react'
import { NftsCollectionTable } from '~/components/Table'
import { filterCollectionsByCurrency } from '~/utils'

function NFTCollectionList({
	collections,
	// itemMax = 100,
	displayUsd = false
}) {
	// sorting
	const [collectionsList, setCollectionsList] = useState([])

	const displayCurrency = displayUsd ? '$' : '' // TODO show non-USD currency symbols

	useEffect(() => {
		setCollectionsList(collections)
	}, [collections])

	const filteredListByCurrency = useMemo(() => filterCollectionsByCurrency(collectionsList, '$'), [collectionsList])

	return <NftsCollectionTable data={filteredListByCurrency} />
}

export default NFTCollectionList
