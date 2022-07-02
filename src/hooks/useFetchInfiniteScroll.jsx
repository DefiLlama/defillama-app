import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { ChevronsUp } from 'react-feather'
import { Button } from 'rebass'
import { NFT_COLLECTIONS_API } from '~/constants'

export default function useFetchInfiniteScroll({ list = [], cursor = null, filters = [], setFetchedData, setCursor }) {
	const { asPath } = useRouter()
	const path = asPath.split('/').slice(2).join('/') ?? ''

	const [dataLength, setDatalength] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const [displayScrollToTopButton, setDisplayScrollToTopButton] = useState(false)

	useEffect(() => {
		window.addEventListener('scroll', () => {
			if (window.scrollY > 200) {
				setDisplayScrollToTopButton(true)
			} else {
				setDisplayScrollToTopButton(false)
			}
		})
	}, [])

	// Reset when category changes or else might be limited if one category is smaller than the other
	const stringifyFilters = JSON.stringify(filters)
	useEffect(() => {
		setHasMore(true)
		setDatalength(list.length)
	}, [stringifyFilters, list])

	const handleScrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		})
	}

	const next = async () => {
		setIsLoading(true)
		const { PK, SK, totalVolumeUSD, category } = cursor || {}

		const nextCursor = encodeURIComponent(
			JSON.stringify({
				PK,
				SK,
				totalVolumeUSD,
				category
			})
		)

		const url = `${NFT_COLLECTIONS_API}${path ? `/${path}` : ''}?cursor=${nextCursor}`

		const { data, cursor: newCursor } = await fetch(url).then((r) => r.json())

		setFetchedData(list.concat(data))
		setCursor(newCursor)
		setIsLoading(false)

		if (!newCursor) {
			setHasMore(false)
		}
	}

	const LoadMoreButton = (
		<Button
			displayScrollToTopButton={displayScrollToTopButton}
			onClick={handleScrollToTop}
			sx={{
				borderRadius: '50%',
				padding: 0,
				color: 'inherit',
				width: 36,
				height: 36,
				position: 'fixed',
				zIndex: 1,
				left: '50%',
				transform: 'translateX(-50%)',
				bottom: '2rem',
				opacity: 0.2,
				cursor: 'Pointer',
				display: displayScrollToTopButton ? 'inline' : 'none'
			}}
		>
			<ChevronsUp />
		</Button>
	)

	return {
		dataLength,
		LoadMoreButton,
		hasMore,
		isLoading,
		next
	}
}
