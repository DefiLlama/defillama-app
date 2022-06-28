import * as React from 'react'
import styled from 'styled-components'
import TokenLogo from '~/components/TokenLogo'
import { tokenIconUrl } from '~/utils'

const StyledToggle = styled.div`
	display: flex;
	width: fit-content;
	cursor: pointer;
	text-decoration: none;
	margin-top: 1rem;
	color: white;

	:hover {
		text-decoration: none;
	}
`

const IconWrapper = styled.div`
	opacity: 0.7;

	:hover {
		opacity: 1;
	}
`

export default function Links({ logo, links }) {
	const filteredLinks = Object.keys(links)
		.filter((k) => links[k] !== '')
		.reduce((a, k) => ({ ...a, [k]: links[k] }), {})

	const icons = {
		website: (
			<IconWrapper>
				<TokenLogo logo={logo} size={32} style={{ alignSelf: 'center' }} external />
			</IconWrapper>
		),
		discord: (
			<IconWrapper>
				<TokenLogo logo={tokenIconUrl('discord')} size={32} style={{ alignSelf: 'center' }} />
			</IconWrapper>
		),
		telegram: (
			<IconWrapper>
				<TokenLogo logo={tokenIconUrl('telegram')} size={32} style={{ alignSelf: 'center' }} />
			</IconWrapper>
		),
		medium: (
			<IconWrapper>
				<TokenLogo logo={tokenIconUrl('medium')} size={32} style={{ alignSelf: 'center' }} />
			</IconWrapper>
		),
		twitter: (
			<IconWrapper>
				<TokenLogo logo={tokenIconUrl('twitter')} size={32} style={{ alignSelf: 'center' }} />
			</IconWrapper>
		)
	}

	const linkComponents = Object.keys(filteredLinks).map((linkName, i) => (
		<span key={i} style={{ paddingRight: '1.00rem' }}>
			<a href={links[linkName]} target="_blank" rel="noopener noreferrer">
				{icons[linkName]}
			</a>
		</span>
	))

	return <StyledToggle>{linkComponents}</StyledToggle>
}
