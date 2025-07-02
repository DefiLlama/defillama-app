import { instantMeiliSearch } from '@meilisearch/instant-meilisearch'
import { InstantSearch } from 'react-instantsearch'
import { ReactNode } from 'react'

const { searchClient } = instantMeiliSearch(
	'https://search.defillama.com',
	'0050e4b518781e324a259db278687ec0031b9601c1c6a87aa7174c13ecdbd057'
)

interface SearchV2Props {
	indexName: string
	children: ReactNode
}

export const SearchV2 = ({ indexName, children }: SearchV2Props) => {
	return (
		<InstantSearch
			indexName={indexName}
			searchClient={searchClient as any}
			future={{ preserveSharedStateOnUnmount: true }}
		>
			{children}
		</InstantSearch>
	)
}
