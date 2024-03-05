export interface IWatchlist {
	[portfolio: string]: {
		[item: string]: string
	}
}

export interface ISettings {
	[item: string]: boolean
}

export type TUpdater = (key: string, shouldUpdateRouter?: boolean) => () => void
