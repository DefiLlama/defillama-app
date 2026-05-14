import type { CommandLogger } from './logger'
import type { ActiveChildren } from './runChild'

export function killActiveChildren(activeChildren: ActiveChildren, signal: NodeJS.Signals = 'SIGTERM'): void {
	try {
		for (const child of activeChildren) {
			if (!child.killed) {
				try {
					child.kill(signal)
				} catch {
					// Child may have exited between tracking and cleanup.
				}
			}
		}
	} finally {
		activeChildren.clear()
	}
}

type InstallProcessLifecycleOptions = {
	activeChildren: ActiveChildren
	logger: Pick<CommandLogger, 'close' | 'flush' | 'log'>
}

export function installProcessLifecycle({ activeChildren, logger }: InstallProcessLifecycleOptions): () => void {
	let closed = false
	const close = () => {
		if (closed) return
		closed = true
		killActiveChildren(activeChildren)
		logger.flush()
		logger.close()
	}
	const onSignal = (signal: NodeJS.Signals) => {
		logger.log(`Received ${signal}; stopping active child processes`)
		close()
		process.exit(signal === 'SIGINT' ? 130 : 143)
	}
	const onExit = () => {
		close()
	}

	process.once('SIGINT', onSignal)
	process.once('SIGTERM', onSignal)
	process.once('exit', onExit)

	return () => {
		process.off('SIGINT', onSignal)
		process.off('SIGTERM', onSignal)
		process.off('exit', onExit)
	}
}
