export type DatasetDomainBuildResult = {
	builtAt: number
}

export type DatasetDomainBuildAdapter = (rootDir: string) => Promise<DatasetDomainBuildResult>
