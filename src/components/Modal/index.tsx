import React from 'react'
import { CloseButton, ModalContent, ModalHeader, ModalTitle, ModalWrapper } from './styles'

export const Modal = ({ children, isOpen, onClose, title = '' }) => {
	if (!isOpen) return null
	return (
		<>
			<ModalWrapper open={isOpen}>
				<ModalContent>
					<ModalHeader>
						<ModalTitle>{title}</ModalTitle>
						<CloseButton onClick={onClose}>&#10005;</CloseButton>
					</ModalHeader>
					{children}
				</ModalContent>
			</ModalWrapper>
		</>
	)
}
