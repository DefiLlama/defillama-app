import dayjs from 'dayjs'
import Link from 'next/link'
import { transparentize } from 'polished'
import { ArrowUpRight } from 'react-feather'
import styled from 'styled-components'
import { Button } from '~/layout/ProtocolAndPool'
import { IArticle } from '~/api/categories/news'

const Container = styled.a`
	background-color: ${({ color }) => transparentize(0.9, color)};
	padding: 8px;
	border-radius: 12px;
	display: flex;
	flex-direction: column;
	gap: 12px;

	&:hover {
		background-color: ${({ color }) => transparentize(0.8, color)};
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		flex-direction: row;
	}
`

const Img = styled.img`
	object-fit: cover;
	border-radius: 4px;
	width: 100%;
	height: 100px;

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		width: 200px;
		min-width: 200px;
		height: 100px;
	}
`

const Headline = styled.div`
	font-size: 0.875rem;
	font-weight: 500;
`

const Content = styled.div`
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 14px;
	justify-content: space-between;
`

const Metadata = styled.div`
	color: ${({ theme }) => theme.text1};
	font-weight: 400;
	font-size: 0.75rem;
	opacity: 0.8;
	white-space: wrap;
`

const Footer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 14px;

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		flex-direction: row;
		align-items: flex-end;
		justify-content: space-between;
	}
`

interface INewsCardProps extends IArticle {
	color: string
}

export const NewsCard = ({ imgSrc, href, headline, date, color }: INewsCardProps) => {
	return (
		<Link legacyBehavior href={href} passHref>
			<Container color={color} target="_blank">
				{imgSrc && <Img src={imgSrc} alt={headline} />}
				<Content>
					<Headline>{headline}</Headline>

					<Footer>
						<Metadata>{dayjs(date).format('MMMM D, YYYY')}</Metadata>

						<Button useTextColor={true} color={color} style={{ justifyContent: 'space-between' }}>
							<span>Read on DL News</span> <ArrowUpRight size={14} />
						</Button>
					</Footer>
				</Content>
			</Container>
		</Link>
	)
}
