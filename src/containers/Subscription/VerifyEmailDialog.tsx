import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { EmailOtpForm } from '~/containers/Subscription/EmailOtpForm'

const dialogCls =
	'dialog top-1/2 right-auto bottom-auto left-1/2 m-0 max-h-[90dvh] min-h-0 w-[calc(100vw-32px)] max-w-[360px] -translate-x-1/2 -translate-y-1/2 gap-0 overflow-y-auto rounded-2xl bg-(--signin-bg) px-5 pt-6 pb-5 shadow-2xl'

export function VerifyEmailDialog({
	isOpen,
	email,
	onClose
}: {
	isOpen: boolean
	email?: string
	onClose: () => void
}) {
	return (
		<Ariakit.DialogProvider open={isOpen} setOpen={(open) => !open && onClose()}>
			<Ariakit.Dialog backdrop={<div className="bg-black/60" />} className={dialogCls} portal unmountOnHide>
				<div className="mb-5 flex items-center justify-between">
					<h2 className="text-xl font-semibold text-(--text-primary)">Verify your email</h2>
					<Ariakit.DialogDismiss className="rounded-full p-1 text-(--text-tertiary) transition-colors hover:text-(--text-primary)">
						<Icon name="x" height={20} width={20} />
						<span className="sr-only">Close</span>
					</Ariakit.DialogDismiss>
				</div>
				{isOpen ? <EmailOtpForm email={email} onVerified={onClose} /> : null}
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
