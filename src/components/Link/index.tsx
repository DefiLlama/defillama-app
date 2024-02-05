import * as React from 'react'
import { Link as RebassLink } from 'rebass'
import RouterLink from 'next/link'
import styled from 'styled-components'
import { lighten, darken } from 'polished'

interface BasicLinkProps {
	href?: string
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

const WrappedLink = ({
	external,
	children,
	...rest
}: {
	external?: boolean
	children: React.ReactNode
	href?: string
}) => (
	<RebassLink
		target={external ? '_blank' : null}
		rel={external ? 'noopener noreferrer' : null}
		color="#2f80ed"
		{...rest}
	>
		{children}
	</RebassLink>
)

const Link = styled(WrappedLink)`
	color: ${({ theme }) => theme.link};
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
		<RouterLink href={href} passHref prefetch={false} legacyBehavior>
			<CustomLinkStyle target={target} {...props}>
				{children}
			</CustomLinkStyle>
		</RouterLink>
	)
}

export const BasicLink = ({ href, children, shallow, ...props }: BasicLinkProps) => (
	<RouterLink href={href} passHref prefetch={false} shallow={shallow} legacyBehavior>
		<a {...props}>{children}</a>
	</RouterLink>
)
