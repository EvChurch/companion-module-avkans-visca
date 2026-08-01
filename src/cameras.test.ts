import { InstanceStatus } from '@companion-module/base'
import { describe, expect, test, vi } from 'vitest'
import { CameraManager, type CameraPort, type CameraPortFactory } from './cameras.js'
import { noCameraConfig, type AvkansLv20nConfig } from './config.js'
import { ModuleDefinedCommand } from './visca/command.js'

function configWith(...entries: Array<[1 | 2 | 3 | 4, string, string]>): AvkansLv20nConfig {
	const config = structuredClone(noCameraConfig())
	for (const [slot, name, host] of entries) config.cameras[slot] = { name, host }
	return config
}

function harness(stopTimeoutMs = 20) {
	const ports = new Map<string, CameraPort & { sent: number[][]; close: ReturnType<typeof vi.fn> }>()
	const factory: CameraPortFactory = vi.fn((instance) => {
		const port = {
			sent: [] as number[][],
			open: vi.fn((host: string) => {
				ports.set(host, port)
				instance.updateStatus(InstanceStatus.Ok)
			}),
			close: vi.fn(),
			sendCommand: vi.fn(async (command: ModuleDefinedCommand) => {
				port.sent.push([...command.toBytes()])
			}),
			sendInquiry: vi.fn(),
			sendRawInquiry: vi.fn(),
		} as unknown as CameraPort & { sent: number[][]; close: ReturnType<typeof vi.fn> }
		return port
	})
	const host = {
		debugLogging: false,
		log: vi.fn(),
		updateStatus: vi.fn(),
		onStateChanged: vi.fn(),
		onCameraStatusChanged: vi.fn(),
	}
	return { manager: new CameraManager(host, factory, stopTimeoutMs), host, ports, factory }
}

describe('CameraManager', () => {
	test('routes commands to only the requested camera and closes every session', async () => {
		const { manager, ports } = harness()
		manager.reconcile(configWith([1, 'Wide', '10.0.0.1'], [2, 'Tight', '10.0.0.2']))
		const command = new ModuleDefinedCommand([0x81, 0x01, 0x04, 0x07, 0x00, 0xff])
		await manager.sendCommand(2, command)
		expect(ports.get('10.0.0.1')?.sent).toEqual([])
		expect(ports.get('10.0.0.2')?.sent).toEqual([[0x81, 0x01, 0x04, 0x07, 0x00, 0xff]])

		manager.close()
		expect(ports.get('10.0.0.1')?.close).toHaveBeenCalled()
		expect(ports.get('10.0.0.2')?.close).toHaveBeenCalled()
	})

	test('opens independent sessions and preserves unchanged slots', () => {
		const { manager, ports, factory, host } = harness()
		const config = configWith([1, 'Wide', '10.0.0.1'], [2, 'Tight', '10.0.0.2'])
		manager.reconcile(config)
		expect(factory).toHaveBeenCalledTimes(2)
		expect(manager.activeSlot).toBe(1)
		expect(host.onCameraStatusChanged).toHaveBeenCalledWith(1, InstanceStatus.Ok)
		expect(host.onCameraStatusChanged).toHaveBeenCalledWith(2, InstanceStatus.Ok)

		const first = ports.get('10.0.0.1')
		config.cameras[2].host = '10.0.0.22'
		manager.reconcile(config)
		expect(factory).toHaveBeenCalledTimes(3)
		expect(ports.get('10.0.0.1')).toBe(first)
		expect(ports.get('10.0.0.2')?.close).toHaveBeenCalledOnce()
	})

	test('cycles sparse slots with wraparound', async () => {
		const { manager } = harness()
		manager.reconcile(configWith([1, 'Wide', '10.0.0.1'], [4, 'Stage', '10.0.0.4']))
		await manager.selectNext()
		expect(manager.activeSlot).toBe(4)
		await manager.selectNext()
		expect(manager.activeSlot).toBe(1)
		await manager.selectPrevious()
		expect(manager.activeSlot).toBe(4)
	})

	test('attempts all movement stops before switching', async () => {
		const { manager, ports } = harness()
		manager.reconcile(configWith([1, 'Wide', '10.0.0.1'], [2, 'Tight', '10.0.0.2']))
		await manager.select(2)
		expect(ports.get('10.0.0.1')?.sent).toEqual([
			[0x81, 0x01, 0x06, 0x01, 0x0c, 0x0c, 0x03, 0x03, 0xff],
			[0x81, 0x01, 0x04, 0x07, 0x00, 0xff],
			[0x81, 0x01, 0x04, 0x08, 0x00, 0xff],
		])
		expect(manager.activeSlot).toBe(2)
	})

	test('bounds failed stop attempts and still switches', async () => {
		const { manager, ports, host } = harness(5)
		manager.reconcile(configWith([1, 'Offline', '10.0.0.1'], [2, 'Live', '10.0.0.2']))
		const old = ports.get('10.0.0.1')
		if (!old) throw new Error('missing fake port')
		old.sendCommand = vi.fn(async () => new Promise(() => undefined)) as CameraPort['sendCommand']
		await manager.select(2)
		expect(manager.activeSlot).toBe(2)
		expect(host.log).toHaveBeenCalledWith('warn', expect.stringContaining('Timed out'))
	})

	test('reports nonfatal VISCA stop errors and still switches', async () => {
		const { manager, ports, host } = harness()
		manager.reconcile(configWith([1, 'Auto focus', '10.0.0.1'], [2, 'Live', '10.0.0.2']))
		const old = ports.get('10.0.0.1')
		if (!old) throw new Error('missing fake port')
		old.sendCommand = vi.fn(async () => new Error('Focus stop unavailable'))
		await manager.select(2)
		expect(manager.activeSlot).toBe(2)
		expect(host.log).toHaveBeenCalledWith('warn', expect.stringContaining('Focus stop unavailable'))
	})
})
