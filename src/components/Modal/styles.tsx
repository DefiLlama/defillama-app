import styled from 'styled-components'

export const ModalWrapper = styled.div<{ open: boolean }>`
	display: ${(props) => (props.open ? 'block' : 'none')};
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 999;
	input {
		width: 100%;
		margin-right: auto;
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};

		font-size: 0.875rem;
		border: none;
	}
`

export const ModalContent = styled.div`
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	padding: 24px;
	background-color: ${({ theme }) => theme.background};
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); /* Shadow */
	border-radius: 10px;
	min-height: 520px;
	overflow: scroll;

	&::-webkit-scrollbar {
		display: none;
	}
`

export const CloseButton = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 20px;
	position: relative;
	cursor: pointer;
	font-size: 24px;
`

export const OpenButton = styled.button`
	padding: 10px 20px;
	background-color: #007bff;
	color: #fff;
	border: none;
	border-radius: 4px;
	font-size: 16px;
	cursor: pointer;
	transition: background-color 0.3s;

	&:hover {
		background-color: #0056b3;
	}
`

export const ModalHeader = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 20px;
	position: relative;
`

export const ModalTitle = styled.h2`
	margin: 0;
	font-size: 24px;
	text-align: center;
	width: 100%;
`
