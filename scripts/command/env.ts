import { loadEnvConfig, updateInitialEnv, type LoadedEnvFiles } from '@next/env'

type AppEnvMode = 'development' | 'production' | 'test'

type LoadAppEnvOptions = {
	forceReload?: boolean
	logger?: Pick<Console, 'error' | 'info'>
	projectDir?: string
}

type LoadedAppEnv = {
	loadedEnvFiles: LoadedEnvFiles
	mode: AppEnvMode
}

function restoreNodeEnv(value: string | undefined): void {
	const env = process.env as Record<string, string | undefined>
	if (value === undefined) {
		delete env.NODE_ENV
	} else {
		env.NODE_ENV = value
	}
}

export function getAppEnvMode(env: NodeJS.ProcessEnv = process.env): AppEnvMode {
	if (env.NODE_ENV === 'production' || env.NODE_ENV === 'test') {
		return env.NODE_ENV
	}
	return 'development'
}

export function loadAppEnv({
	forceReload = false,
	logger = console,
	projectDir = process.cwd()
}: LoadAppEnvOptions = {}): LoadedAppEnv {
	const originalNodeEnv = process.env.NODE_ENV
	updateInitialEnv({ NODE_ENV: originalNodeEnv })
	const mode = getAppEnvMode()
	const { loadedEnvFiles } = loadEnvConfig(projectDir, mode === 'development', logger, forceReload)

	restoreNodeEnv(originalNodeEnv)

	return { loadedEnvFiles, mode }
}
