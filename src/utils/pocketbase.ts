import PocketBase from 'pocketbase'
import { RecordModel } from 'pocketbase'
export const pb = new PocketBase('https://pb.llama.fi')

export interface AuthModel extends RecordModel {
	id: string
	email?: string
	walletAddress?: string
	name?: string
	avatar?: string
	created: string
	updated: string
}

export default pb
