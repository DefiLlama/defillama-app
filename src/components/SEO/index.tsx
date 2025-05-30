import { useMemo } from 'react'
import Head from 'next/head'
import { chainIconUrl, formattedNum, tokenIconUrl } from '~/utils'
import { useIsClient } from '~/hooks'
import { ADAPTOR_TYPES } from '~/api/categories/adaptors'

interface SEOProps {
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
	symbol?: string
}

export const SEO = ({
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
	isCEX,
	symbol
}: SEOProps) => {
	const isClient = useIsClient()

	const windowURL = isClient && window.location.href ? window.location.href : ''

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

	let pageTitle = 'DefiLlama'
	let pageDescription = "DefiLlama is a DeFi TVL aggregator. It is committed to providing accurate data without ads or sponsored content, as well as transparency.";
	let pageKeywords = ''

	if (unlockPage && cardName) {
		pageTitle = `${cardName} ${symbol} Token Unlocks & Vesting Schedules - DefiLlama`
		pageDescription = `Track upcoming ${cardName} token unlocks, detailed vesting schedules, and key emission data on DefiLlama. Stay informed on ${symbol} release events and supply changes.`
		pageKeywords = `${cardName} ${symbol} token unlocks, vesting schedules, emission data, DefiLlama, ${symbol}, ${cardName}, ${symbol} Tokenomics, ${symbol} Unlocks, ${symbol} Vesting Schedule, ${cardName} Unlocks, ${cardName} Vesting Schedule, ${cardName} Tokenomics`
	}

	return (
		<Head>
			<meta
				name="description"
				content={pageDescription}
			/>

			{pageKeywords !== '' && (
				<meta name="keywords" content={pageKeywords} />
			)}

			<meta property="og:title" content={pageTitle} />
			<meta property="og:type" content="website" />
			<meta property="og:url" content={windowURL} />
			<meta property="og:site_name" content="DefiLlama" />
			<meta
				property="og:description"
				content={pageDescription}
			/>
			<meta property="og:image" content={cardURL} />

			<meta name="twitter:card" content="summary_large_image" />
			<meta property="twitter:domain" content="defillama.com" />
			<meta property="twitter:url" content={windowURL} />
			<meta name="twitter:title" content={pageTitle} />
			<meta name="twitter:site" content="@DefiLlama" />
			<meta name="twitter:creator" content="@DefiLlama" />
			<meta
				name="twitter:description"
				content={pageDescription}
			/>
			<meta name="twitter:image" content={cardURL} />
		</Head>
	)
}
