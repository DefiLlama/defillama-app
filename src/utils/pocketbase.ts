import PocketBase, { RecordModel } from 'pocketbase'
import { POCKETBASE_URL } from '~/constants'

export const pb = new PocketBase(POCKETBASE_URL)

export interface AuthModel extends RecordModel {
	id: string
	email?: string
	walletAddress?: string
	name?: string
	avatar?: string
	created: string
	updated: string
	has_active_subscription: boolean
	flags: Record<string, boolean>
}

export default pb
