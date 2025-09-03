import { memo, useMemo } from 'react'
import Head from 'next/head'
import { ADAPTOR_TYPES } from '~/api/categories/adaptors'
import { chainIconUrl, slug, tokenIconUrl } from '~/utils'

interface ILinkPreviewCardProps {
	cardName?: string
	chain?: string
	token?: string
	tvl?: string
	volumeChange?: string
	logo?: string
	nftPage?: boolean
	liqsPage?: boolean
	stablePage?: boolean
	unlockPage?: boolean
	unlockAmount?: string
	pageType?: string
	isCEX?: boolean
}

// page title, description, keywords
// cardName ? optional
// value name & tvl ? optional

// volumeChange remove for now

export const LinkPreviewCard = ({
	cardName,
	chain,
	token,
	tvl,
	volumeChange,
	logo,
	nftPage = false,
	liqsPage = false,
	stablePage = false,
	unlockPage = false,
	unlockAmount,
	pageType,
	isCEX
}: ILinkPreviewCardProps) => {
	const windowURL = typeof window !== 'undefined' && window.location.href ? window.location.href : ''

	const isTvlValid = unlockPage ? true : tvl && tvl !== '$0'

	const isVolumeChangeValid = volumeChange && volumeChange !== 'NaN%' && volumeChange !== 'undefined%'

	const cardURL = useMemo(() => {
		let cardSrc = new URL(`https://og-cards-chi.vercel.app/`)

		// If text is default, the image will only have the logo in the center, without any tvl numbers, chain or token name etc
		let text: string = cardName ? (cardName === 'All' ? 'Overall' : cardName) : 'default'

		cardSrc.pathname = `${encodeURIComponent(text)}.jpeg`

		cardSrc.searchParams.append('theme', 'dark')

		let valueHeader: string
		if (nftPage) {
			valueHeader = 'Total Volume'
		} else if (liqsPage) {
			valueHeader = 'Total Liquidatable Amount'
		} else if (stablePage) {
			valueHeader = 'Market Cap'
		} else if (unlockPage) {
			if (unlockAmount !== '$0') {
				valueHeader = 'Next Unlock | ' + unlockAmount
			} else {
				valueHeader = `Next Unlock`
			}
		} else if (pageType === ADAPTOR_TYPES.FEES) {
			valueHeader = '24h fees'
		} else if (
			pageType === ADAPTOR_TYPES.DEXS ||
			pageType === ADAPTOR_TYPES.AGGREGATORS ||
			pageType === ADAPTOR_TYPES.PERPS ||
			pageType === ADAPTOR_TYPES.PERPS_AGGREGATOR ||
			pageType === ADAPTOR_TYPES.OPTIONS ||
			pageType === ADAPTOR_TYPES.BRIDGE_AGGREGATORS
		) {
			valueHeader = '24h volume'
		} else {
			valueHeader = isCEX ? 'Total Assets' : 'Total Value Locked'
		}

		cardSrc.searchParams.append('valueHeader', valueHeader)

		isTvlValid && cardSrc.searchParams.append('tvl', tvl)

		isVolumeChangeValid && cardSrc.searchParams.append('volumeChange', volumeChange)

		cardSrc.searchParams.append('footerURL', encodeURIComponent(windowURL))

		// First url in images should always be the logo of defillama
		let images = nftPage
			? [`https://defillama.com/defillama-press-kit/nft/SVG/defillama-nft.svg`]
			: [`https://defillama.com/defillama-press-kit/defi/SVG/defillama.svg`]

		// chain and token props are used to get logo, if the logo url isn't available in the data of that page
		if (logo) {
			images = [...images, logo]
		} else if (chain && chain !== 'All') {
			images = [...images, `https://defillama.com${chainIconUrl(chain)}`]
		} else {
			if (token && token !== 'All') {
				images = [...images, `https://defillama.com${tokenIconUrl(token)}`]
			}
		}

		for (let image of images) {
			cardSrc.searchParams.append('images', image)
		}

		return cardSrc.toString()
	}, [
		cardName,
		chain,
		token,
		tvl,
		volumeChange,
		logo,
		nftPage,
		unlockPage,
		unlockAmount,
		windowURL,
		isTvlValid,
		isVolumeChangeValid,
		pageType,
		liqsPage,
		isCEX,
		stablePage
	])

	return (
		<Head>
			<meta property="og:image" content={cardURL} />
			<meta name="twitter:image" content={cardURL} />
		</Head>
	)
}

export interface ISEOProps {
	title: string
	description?: string
	keywords?: string
	canonicalUrl?: string
}

export const SEO = memo(function SEO({ title, description, keywords, canonicalUrl }: ISEOProps) {
	const url = `https://defillama.com${slug(canonicalUrl ?? '')}`
	return (
		<Head>
			<link rel="canonical" href={url} />
			<title>{title}</title>
			{description ? <meta name="description" content={description} /> : null}
			{keywords ? <meta name="keywords" content={keywords} /> : null}
			<meta property="og:title" content={title} />
			<meta property="og:type" content="website" />
			<meta property="og:url" content={url} />
			<meta property="og:site_name" content="DefiLlama" />
			{description ? <meta property="og:description" content={description} /> : null}
			{/* <meta property="og:image" content={cardURL} /> */}
			<meta name="twitter:card" content="summary_large_image" />
			<meta property="twitter:domain" content="defillama.com" />
			<meta property="twitter:url" content={url} />
			<meta name="twitter:title" content={title} />
			<meta name="twitter:site" content="@DefiLlama" />
			<meta name="twitter:creator" content="@DefiLlama" />
			{description ? <meta name="twitter:description" content={description} /> : null}
			{/* <meta name="twitter:image" content={cardURL} /> */}
		</Head>
	)
})
