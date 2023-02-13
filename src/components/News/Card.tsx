import styled from 'styled-components'
import { IArticle } from '~/api/categories/news'
import { transparentize } from 'polished'

const NewsCardContainer = styled.a`
	background-color: ${({ color }) => transparentize(0.9, color)};
	padding: 8px;
	border-radius: 12px;
	display: flex;
	flex-direction: column;
	gap: 12px;

	:hover {
		text-decoration: underline;
		background-color: ${({ color }) => transparentize(0.8, color)};
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		flex-direction: row;
	}
`

const NewsCardImg = styled.img`
	object-fit: cover;
	border-radius: 4px;
	width: 100%;
	height: 100px;

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		width: 200px;
		height: 100px;
	}
`

const NewsCardHeadline = styled.div`
	font-size: 0.875rem;
	font-weight: 500;
`

interface INewsCardProps extends IArticle {
	color: string
}

export const NewsCard = ({ imgSrc, href, headline, color }: INewsCardProps) => {
	return (
		<NewsCardContainer target="_blank" rel="noopener noreferrer" color={color} href={href}>
			{imgSrc && <NewsCardImg src={imgSrc} alt={headline} />}
			<NewsCardHeadline>{headline}</NewsCardHeadline>
		</NewsCardContainer>
	)
}
