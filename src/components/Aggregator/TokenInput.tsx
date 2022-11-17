import styled from 'styled-components'

const InputElem = styled.input`
	cursor: text;
	display: block;
	height: 48px;
	width: 100%;
	padding: 8px 16px;
	line-height: 25px;
	font-size: 14px;
	font-weight: 500;
	font-family: inherit;
	-webkit-appearance: none;
	color: ${({ theme }) => (theme.mode !== 'dark' ? '#000' : '#fff')};
	border: ${({ theme }) => (theme.mode === 'dark' ? '1px solid #232323;' : '1px solid #cdd9ed;')};
	background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};
	transition: border 0.3s ease;
	&::placeholder {
		color: #cbd1dc;
	}
	&:focus {
		outline: none;
		border-color: ${({ theme }) => (theme.mode === 'dark' ? '#949494' : '#8e8e8e')};
	}
`

const InputWrapper = styled.div`
	position: relative;
	display: flex;
	width: 100%;
	margin-top: 4px;
	& > input,
	span {
		white-space: nowrap;
		display: block;
		&:not(:first-child):not(:last-child) {
			border-radius: 0;
		}
		&:first-child {
			border-radius: 12px 0 0 12px;
		}
		&:last-child {
			border-radius: 0 12px 12px 0;
		}
		&:only-child {
			border-radius: 12px;
		}
		&:not(:first-child) {
			margin-left: -2px;
		}
	}

	& > input {
		position: relative;
		z-index: 1;
		flex: 1 1 auto;
		width: 1%;
		margin-top: 0;
		margin-bottom: 0;
	}

	input[type='number']::-webkit-outer-spin-button,
	input[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	& > span {
		text-align: center;
		cursor: pointer;
		padding: 8px 12px;
		font-size: 14px;
		line-height: 30px;
		height: 48px;
		color: ${({ theme }) => (theme.mode === 'dark' ? '#1c1f2d' : '#727272')};
		border: ${({ theme }) => (theme.mode === 'dark' ? '1px solid #232323;' : '1px solid #cdd9ed;')};
		background: ${({ theme }) => (theme.mode === 'dark' ? '#787878' : '#d8d8d8')};
		transition: background 0.3s ease, border 0.3s ease, color 0.3s ease;
	}
`

export const TokenInput = ({ setAmount, amount, onMaxClick, ...props }) => {
	return (
		<InputWrapper>
			<InputElem
				placeholder="Token amount"
				type="number"
				pattern="\d+((\.|,)\d+)?"
				onChange={(val) => {
					setAmount(val.target.value)
				}}
				value={amount}
				{...props}
			/>
			<span onClick={onMaxClick}>Max</span>
		</InputWrapper>
	)
}

export const Input = (props) => {
	return (
		<InputWrapper {...props}>
			<InputElem {...props} />
		</InputWrapper>
	)
}
