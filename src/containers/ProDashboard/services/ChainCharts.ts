import { CHART_API, DIMENISIONS_OVERVIEW_API, PROTOCOL_ACTIVE_USERS_API, PROTOCOL_TRANSACTIONS_API } from '~/constants'

export default class ChainCharts {
	static tvl = async (chain: string): Promise<[string, number][]> => {
		try {
			const response = await fetch(`${CHART_API}/${chain}`)

			if (!response.ok) {
				throw new Error(`Failed to fetch TVL data for ${chain}: ${response.status} ${response.statusText}`)
			}
			const jsonData = await response.json()
			if (!jsonData.tvl || !Array.isArray(jsonData.tvl)) {
				return []
			}

			return jsonData.tvl
		} catch (error) {
			throw error
		}
	}

	static volume = async (chain: string): Promise<[string, number][]> => {
		try {
			const response = await fetch(`${DIMENISIONS_OVERVIEW_API}/dexs/${chain}`)

			if (!response.ok) {
				throw new Error(`Failed to fetch voume data for ${chain}: ${response.status} ${response.statusText}`)
			}
			const jsonData = await response.json()
			if (!jsonData.totalDataChart || !Array.isArray(jsonData.totalDataChart)) {
				return []
			}

			return jsonData.totalDataChart
		} catch (error) {
			throw error
		}
	}

	static fees = async (chain: string): Promise<[string, number][]> => {
		try {
			const response = await fetch(`${DIMENISIONS_OVERVIEW_API}/fees/${chain}`)
			if (!response.ok) {
				throw new Error(`Failed to fetch fees data for ${chain}: ${response.status} ${response.statusText}`)
			}
			const jsonData = await response.json()

			if (!jsonData.totalDataChart || !Array.isArray(jsonData.totalDataChart)) {
				return []
			}

			return jsonData.totalDataChart
		} catch (error) {
			console.error(`Error in fees fetch for ${chain}:`, error)
			throw error
		}
	}
	static users = async (chain: string): Promise<[string, number][]> => {
		try {
			const response = await fetch(`${PROTOCOL_ACTIVE_USERS_API}/chain$${chain}`)
			const jsonData = await response.json()
			return jsonData
		} catch (error) {
			console.error(`Error in users fetch for ${chain}:`, error)
			throw error
		}
	}
	static txs = async (chain: string): Promise<[string, number][]> => {
		try {
			const response = await fetch(`${PROTOCOL_TRANSACTIONS_API}/chain$${chain}`)
			const jsonData = await response.json()
			return jsonData
		} catch (error) {
			console.error(`Error in txs fetch for ${chain}:`, error)
			throw error
		}
	}
}
