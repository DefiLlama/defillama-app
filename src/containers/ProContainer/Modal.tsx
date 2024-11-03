import { useState } from 'react'
import styled from 'styled-components'
import { Icon } from '~/components/Icon'

const ModalOverlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 1000;
`

const ModalContent = styled.div`
	background-color: ${({ theme }) => (theme.mode === 'dark' ? '#090a0b' : 'white')};

	padding: 20px;
	border-radius: 8px;
	box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.3);
`
const Button = styled.button`
	display: flex;
	vertical-align: center;
	border-radius: 12px;
	background-color: ${({ theme }) => (theme.mode === 'dark' ? 'black' : 'white')};
	padding: 8px 16px;
	margin-right: 8px;
`

const CloseButton = styled.button`
	position: absolute;
	top: 10px;
	right: 10px;
	background: none;
	border: none;
	font-size: 20px;
	cursor: pointer;
`
export const Modal = ({ children, onClose, onSave, openText, ...props }) => {
	const [isOpen, setIsOpen] = useState(false)

	const openModal = () => {
		setIsOpen(true)
	}

	const closeModal = () => {
		setIsOpen(false)
	}

	const handleOverlayClick = (e) => {
		if (e.target === e.currentTarget) {
			closeModal()
		}
	}

	return (
		<>
			<button onClick={openModal}>{openText}</button>
			{isOpen && (
				<ModalOverlay onClick={handleOverlayClick} {...props}>
					<ModalContent>
						<CloseButton onClick={closeModal}>
							<Icon name="crosshair" height={24} width={24} />
						</CloseButton>
						{children}
						<div style={{ display: 'flex', justifyContent: 'end', marginTop: '8px' }}>
							<Button
								onClick={() => {
									onSave()
									closeModal()
								}}
							>
								Add
							</Button>
						</div>
					</ModalContent>
				</ModalOverlay>
			)}
		</>
	)
}
