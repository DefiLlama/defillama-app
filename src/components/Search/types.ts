export interface ISearchItem {
	name: string
	route:
		| string
		| {
				pathname: string
				query: {
					[key: string]: string | Array<string>
				}
		  }
	logo?: string | null
	fallbackLogo?: string | null
	symbol?: string
}
