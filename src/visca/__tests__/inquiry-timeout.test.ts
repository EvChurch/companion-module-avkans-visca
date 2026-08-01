import { InstanceStatus, type LogLevel } from '@companion-module/base'
import net from 'node:net'
import { afterEach, describe, expect, test } from 'vitest'
import { isValidHost } from '../../config.js'
import { VISCAPort, type PartialInstance } from '../port.js'

const host = '127.0.0.1'
if (!isValidHost(host)) throw new Error('Test host is invalid')
const inquiry = [0x81, 0x09, 0x04, 0x00, 0xff] as const

describe('VISCA inquiry timeout', () => {
	const sockets = new Set<net.Socket>()
	let server: net.Server | undefined
	let port: VISCAPort | undefined

	afterEach(async () => {
		port?.close('Test completed', InstanceStatus.Disconnected)
		for (const socket of sockets) socket.destroy()
		if (server?.listening === true) await new Promise<void>((resolve) => server?.close(() => resolve()))
	})

	test('returns an error and reconnects so a late raw reply cannot poison the stream', async () => {
		let connectionCount = 0
		server = net.createServer((socket) => {
			connectionCount++
			sockets.add(socket)
			socket.on('close', () => sockets.delete(socket))
		})
		await new Promise<void>((resolve) => server?.listen(0, host, resolve))
		const address = server.address()
		if (address === null || typeof address === 'string') throw new Error('Mock camera did not open an IP socket')

		const instance: PartialInstance = {
			debugLogging: false,
			log: (_level: LogLevel, _message: string) => undefined,
			updateStatus: (_status: InstanceStatus, _message?: string) => undefined,
		}
		port = new VISCAPort(instance, 'raw', 25)
		port.open(host, address.port)

		const result = await Promise.race([
			port.sendRawInquiry(inquiry),
			new Promise<'test-timeout'>((resolve) => setTimeout(() => resolve('test-timeout'), 250)),
		])

		expect(result).toBeInstanceOf(Error)
		expect(result).not.toBe('test-timeout')
		expect((result as Error).message).toMatch(/inquiry timed out/i)
		await expect.poll(() => connectionCount).toBeGreaterThanOrEqual(2)
	})
})
