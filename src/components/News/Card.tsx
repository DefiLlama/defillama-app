import styled from 'styled-components'
import Link from 'next/link'
import { IArticle } from '~/api/categories/news'

const NewsCardContainer = styled.a`
	display: flex;
	flex-direction: row;
`

const NewsCardImg = styled.img`
	object-fit: cover;
	max-width: 40%;
`

const NewsCardHeadline = styled.div`
	padding-left: 12px;
	font-size: 0.875rem;
`

export const NewsCard = ({ imgSrc, href, headline }: IArticle) => {
	return (
		<Link href={href} passHref>
			<NewsCardContainer target="_blank" rel="noopener noreferrer">
				{imgSrc && <NewsCardImg src={imgSrc} alt={headline} width={200} height={115} />}
				<NewsCardHeadline>{headline}</NewsCardHeadline>
			</NewsCardContainer>
		</Link>
	)
}
