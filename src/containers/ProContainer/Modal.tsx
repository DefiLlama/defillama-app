import { useState } from 'react'
import { Icon } from '~/components/Icon'

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
				<div
					onClick={handleOverlayClick}
					{...props}
					className="fixed top-0 right-0 bottom-0 left-0 bg-black/5 flex items-center justify-center z-[1000]"
				>
					<div className="p-5 rounded-md bg-white dark:bg-[#090a0b] shadow">
						<button onClick={closeModal} className="absolute top-[10px] right-[10px]">
							<Icon name="crosshair" height={24} width={24} />
						</button>
						{children}
						<div style={{ display: 'flex', justifyContent: 'end', marginTop: '8px' }}>
							<button
								onClick={() => {
									onSave()
									closeModal()
								}}
								className="flex align-middle rounded-xl py-3 px-4 mr-2 bg-white dark:bg-black"
							>
								Add
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
