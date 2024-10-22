import * as React from 'react'
import { Link as RebassLink } from 'rebass'
import RouterLink from 'next/link'
import styled from 'styled-components'
import { Icon } from '../Icon'

interface BasicLinkProps {
	href: string
	style?: React.CSSProperties
	children: React.ReactNode
	shallow?: boolean
	onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

interface CustomLinkProps extends BasicLinkProps {
	id?: string
	style?: React.CSSProperties
	target?: React.HTMLAttributeAnchorTarget
}

const WrappedLink = ({ external, children, ...rest }: any) => (
	<RebassLink
		target={external ? '_blank' : null}
		rel={external ? 'noopener noreferrer' : null}
		color="#2f80ed"
		{...rest}
	>
		{children}
	</RebassLink>
)

const StyledLink = styled.a`
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	text-decoration: none;
	color: ${({ theme }) => theme.primary1};
	font-weight: 500;
	transition: color 0.2s ease;

	&:hover {
		color: ${({ theme }) => theme.text1};
	}
`

export const ExternalLink = ({ href, children, ...props }) => {
	return (
		<StyledLink href={href} target="_blank" rel="noopener noreferrer" {...props}>
			{children} <Icon name="external-link" height={16} width={16} />
		</StyledLink>
	)
}

const Link = styled(WrappedLink)`
	color: ${({ color, theme }) => (color ? color : theme.link)};
`

export default Link

export const CustomLinkStyle = styled.a`
	font-size: 14px;
	font-weight: 500;
	color: ${({ theme }) => (theme.mode === 'dark' ? '#629ff4' : '#2172E5')};
`

export const CustomLink = ({ href, children, target, ...props }: CustomLinkProps) => {
	// Must add passHref to Link
	return (
		<RouterLink href={href} passHref prefetch={false}>
			<CustomLinkStyle target={target} {...props}>
				{children}
			</CustomLinkStyle>
		</RouterLink>
	)
}

export const BasicLink = ({ href, children, shallow, ...props }: BasicLinkProps) => (
	<RouterLink href={href} passHref prefetch={false} shallow={shallow}>
		<a {...props}>{children}</a>
	</RouterLink>
)
