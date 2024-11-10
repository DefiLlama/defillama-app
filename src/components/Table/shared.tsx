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

	& > *[data-bookmark] {
		position: absolute;
		left: -2px;
	}

	a {
		overflow: hidden;
		text-overflow: ellipsis;
		whitespace: nowrap;
	}

	a:hover {
		text-decoration: underline;
	}

	& > *[data-lgonly] {
		display: none;
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		& > *[data-lgonly] {
			display: flex;
		}
	}
`
