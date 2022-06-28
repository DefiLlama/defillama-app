import styled from 'styled-components'

const Column = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	& + & {
		margin-left: 20px;
	}
`
export const ColumnCenter = styled(Column)`
	width: 100%;
	align-items: center;
`

interface IAutoColumn {
	gap?: string
	justify?: string
}

export const AutoColumn = styled.div<IAutoColumn>`
	display: grid;
	grid-auto-rows: auto;
	grid-row-gap: ${({ gap }) => (gap === 'sm' && '8px') || (gap === 'md' && '12px') || (gap === 'lg' && '24px') || gap};
	justify-items: ${({ justify }) => justify && justify};
`

export default Column
