import * as React from 'react'
import { Link as RebassLink } from 'rebass'
import RouterLink from 'next/link'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { lighten, darken } from 'polished'

interface BasicLinkProps {
	href: string
	style?: React.CSSProperties
	children: React.ReactNode
	shallow?: boolean
	onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

interface CustomLinkProps extends BasicLinkProps {
	id?: string
	style?: React.CSSProperties
	target?: React.HTMLAttributeAnchorTarget
}

const WrappedLink = ({ external, children, ...rest }) => (
	<RebassLink
		target={external ? '_blank' : null}
		rel={external ? 'noopener noreferrer' : null}
		color="#2f80ed"
		{...rest}
	>
		{children}
	</RebassLink>
)

WrappedLink.propTypes = {
	external: PropTypes.bool
}

const Link = styled(WrappedLink)`
	color: ${({ color, theme }) => (color ? color : theme.link)};
`

export default Link

export const CustomLinkStyle = styled.a`
	font-size: 14px;
	font-weight: 500;
	color: ${({ color, theme }) => (color ? color : theme.link)};

	&:visited {
		color: ${({ color, theme }) => (color ? lighten(0.1, color) : lighten(0.1, theme.link))};
	}

	&:hover {
		color: ${({ color, theme }) => (color ? darken(0.1, color) : darken(0.1, theme.link))};
	}
`

export const CustomLink = ({ href, children, target, ...props }: CustomLinkProps) => {
	// Must add passHref to Link
	return (
		<RouterLink href={href} passHref prefetch={false}>
			<CustomLinkStyle target={target} {...props}>{children}</CustomLinkStyle>
		</RouterLink>
	)
}

export const BasicLink = ({ href, children, shallow, ...props }: BasicLinkProps) => (
	<RouterLink href={href} passHref prefetch={false} shallow={shallow}>
		<a {...props}>{children}</a>
	</RouterLink>
)
