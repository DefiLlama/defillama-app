import styled from 'styled-components'

interface INameProps {
	depth?: number
}

export const Name = styled.span<INameProps>`
	display: flex;
	align-items: center;
	gap: 8px;
	padding-left: ${({ depth }) => (depth ? depth * 48 : depth === 0 ? 24 : 0)}px;
	position: relative;

	a {
		overflow: hidden;
		text-overflow: ellipsis;
		whitespace: nowrap;
	}

	a:hover {
		text-decoration: underline;
	}
`
