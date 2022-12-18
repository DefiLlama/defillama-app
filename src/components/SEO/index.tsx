import { useMemo } from 'react'
import Head from 'next/head'
import { chainIconUrl, tokenIconUrl } from '~/utils'
import { useIsClient } from '~/hooks'
import { type as dexsType } from '~/pages/dexs'
import { type as feesType } from '~/pages/fees'
import { type as aggregatorsType } from '~/pages/aggregators'
import { type as derivativesType } from '~/pages/derivatives'
import { type as optionsType } from '~/pages/options'

interface SEOProps {
	cardName?: string
	chain?: string
	token?: string
	tvl?: string
	volumeChange?: string
	logo?: string
	nftPage?: boolean
	liqsPage?: boolean
	pageType?: string
}

const SEO = ({
	cardName,
	chain,
	token,
	tvl,
	volumeChange,
	logo,
	nftPage = false,
	liqsPage = false,
	pageType
}: SEOProps) => {
	const isClient = useIsClient()

	const windowURL = isClient && window.location.href ? window.location.href : ''

	const isTvlValid = tvl && tvl !== '$0'

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
		} else if (pageType === feesType) {
			valueHeader = '24h fees'
		} else if (
			pageType === dexsType ||
			pageType === aggregatorsType ||
			pageType === derivativesType ||
			pageType === optionsType
		) {
			valueHeader = '24h volume'
		} else {
			valueHeader = 'Total Value Locked'
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
		windowURL,
		isTvlValid,
		isVolumeChangeValid,
		pageType,
		liqsPage
	])

	return (
		<Head>
			<meta
				name="description"
				content="DefiLlama is a DeFi TVL aggregator. It is committed to providing accurate data without ads or sponsored content, as well as transparency."
			/>

			<meta property="og:title" content="DefiLlama" />
			<meta property="og:type" content="website" />
			<meta property="og:url" content={windowURL} />
			<meta property="og:site_name" content="DefiLlama" />
			<meta
				property="og:description"
				content="DefiLlama is a DeFi TVL aggregator. It is committed to providing accurate data without ads or sponsored content, as well as transparency."
			/>
			<meta property="og:image" content={cardURL} />

			<meta name="twitter:card" content="summary_large_image" />
			<meta property="twitter:domain" content="defillama.com" />
			<meta property="twitter:url" content={windowURL} />
			<meta name="twitter:title" content="DefiLlama" />
			<meta name="twitter:site" content="@DefiLlama" />
			<meta name="twitter:creator" content="@DefiLlama" />
			<meta
				name="twitter:description"
				content="DefiLlama is a DeFi TVL aggregator. It is committed to providing accurate data without ads or sponsored content, as well as transparency."
			/>
			<meta name="twitter:image" content={cardURL} />
		</Head>
	)
}

export default SEO
