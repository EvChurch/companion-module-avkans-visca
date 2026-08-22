import { describe, expect, test, vi } from 'vitest'
import { InstanceStatus } from '@companion-module/base'
import { CameraWebApi, setPresetRecallSpeeds } from './camera-web-api.js'
import { normalizeTrackingAbilities } from './tracking.js'

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

function requestUrl(input: string | URL | Request): string {
	return typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
}

function requestBody(init: RequestInit | undefined): unknown {
	return typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
}

describe('AVKANS camera web API preset speeds', () => {
	test('logs in once and writes pan, tilt, and zoom preset speeds', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				jsonResponse({ code: 200, data: { token: 'camera-token', username: 'admin', role_id: 8 } }),
			)
			.mockImplementation(async () => jsonResponse({ code: 200, data: [] }))

		await setPresetRecallSpeeds(
			'10.201.0.50',
			{ username: 'admin', password: 'secret' },
			{ pan: 24, tilt: 20, zoom: 8 },
			fetcher,
		)

		expect(fetcher).toHaveBeenCalledTimes(4)
		expect(fetcher).toHaveBeenNthCalledWith(
			1,
			'http://10.201.0.50/api/auth/login',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ username: 'admin', password: 'secret', remember: false }),
			}),
		)
		for (const [call, key, value] of [
			[2, 'preset_p_speed', 24],
			[3, 'preset_t_speed', 20],
			[4, 'preset_z_speed', 8],
		] as const) {
			expect(fetcher).toHaveBeenNthCalledWith(
				call,
				'http://10.201.0.50/api/pt/set',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ key, value }),
					headers: expect.objectContaining({ Authorization: 'Bearer camera-token' }),
				}),
			)
		}
	})

	test('reports a rejected camera login without attempting writes', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(jsonResponse({ code: 401, message: 'Invalid username or password' }, 401))

		await expect(
			setPresetRecallSpeeds(
				'10.201.0.50',
				{ username: 'admin', password: 'wrong' },
				{ pan: 5, tilt: 5, zoom: 6 },
				fetcher,
			),
		).rejects.toThrow('Invalid username or password')
		expect(fetcher).toHaveBeenCalledTimes(1)
	})

	test.each([
		[{ pan: 0, tilt: 5, zoom: 6 }, 'Pan preset speed must be between 1 and 24'],
		[{ pan: 5, tilt: 21, zoom: 6 }, 'Tilt preset speed must be between 1 and 20'],
		[{ pan: 5, tilt: 5, zoom: 9 }, 'Zoom preset speed must be between 1 and 8'],
	])('rejects speeds outside the camera ranges', async (speeds, message) => {
		const fetcher = vi.fn<typeof fetch>()
		await expect(
			setPresetRecallSpeeds('10.201.0.50', { username: 'admin', password: 'secret' }, speeds, fetcher),
		).rejects.toThrow(message)
		expect(fetcher).not.toHaveBeenCalled()
	})
})

describe('AVKANS native camera controls', () => {
	test('authenticates once and uses native PTZ, preset, and focus endpoints', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(jsonResponse({ code: 200, data: { token: 'token' } }))
			.mockImplementation(async () => jsonResponse({ code: 200, data: [] }))
		const status = vi.fn()
		const api = new CameraWebApi(
			'10.201.0.51',
			{ username: 'operator', password: 'camera-two' },
			{ log: vi.fn(), updateStatus: status },
			fetcher,
		)

		await api.movePanTilt(-1, 1, 12, 10)
		await api.point('recall', 7, 12, 10)
		await api.setAutoFocus(false)
		await api.moveFocus(1)

		expect(status).toHaveBeenCalledWith(InstanceStatus.Ok)
		expect(fetcher).toHaveBeenCalledTimes(5)
		expect(fetcher.mock.calls.slice(1).map(([url, init]) => [url, init?.body])).toEqual([
			[
				'http://10.201.0.51/api/pt/move-rel',
				JSON.stringify({ pan_dir: -1, tilt_dir: 1, pan_speed: 12, tilt_speed: 10 }),
			],
			['http://10.201.0.51/api/pt/point', JSON.stringify({ method: 'recall', id: 7, pan_speed: 12, tilt_speed: 10 })],
			['http://10.201.0.51/api/af/set', JSON.stringify({ key: 'af_auto', value: 0 })],
			['http://10.201.0.51/api/af/set', JSON.stringify({ key: 'af_focus_rel', value: 1 })],
		])
	})

	test('re-authenticates once when the camera expires a token', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(jsonResponse({ code: 200, data: { token: 'old' } }))
			.mockResolvedValueOnce(jsonResponse({ code: 401, message: 'expired' }, 401))
			.mockResolvedValueOnce(jsonResponse({ code: 200, data: { token: 'new' } }))
			.mockResolvedValueOnce(jsonResponse({ code: 200, data: [] }))
		const api = new CameraWebApi(
			'10.201.0.50',
			{ username: 'admin', password: 'secret' },
			{ log: vi.fn(), updateStatus: vi.fn() },
			fetcher,
		)

		await api.moveFocus(0)
		expect(fetcher).toHaveBeenCalledTimes(4)
		expect(fetcher.mock.calls[3][1]?.headers).toMatchObject({ Authorization: 'Bearer new' })
	})

	test('marks only the web session failed when a native request loses the camera', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(jsonResponse({ code: 200, data: { token: 'token' } }))
			.mockRejectedValueOnce(new Error('network unavailable'))
		const status = vi.fn()
		const api = new CameraWebApi(
			'10.201.0.50',
			{ username: 'admin', password: 'secret' },
			{ log: vi.fn(), updateStatus: status },
			fetcher,
			60_000,
		)

		await expect(api.moveFocus(0)).rejects.toThrow('network unavailable')
		expect(status.mock.calls.map(([value]) => value)).toEqual([InstanceStatus.Ok, InstanceStatus.ConnectionFailure])
		api.close()
	})
})

describe('AVKANS tracking controls', () => {
	test('discovers supported settings and refreshes their values', async () => {
		const schema = vi.fn()
		const values = vi.fn()
		const fetcher = vi.fn<typeof fetch>(async (url, init) => {
			const address = requestUrl(url)
			if (address.endsWith('/auth/login')) return jsonResponse({ code: 200, data: { token: 'token' } })
			if (address.includes('/panel-ability?panel=Base1')) {
				return jsonResponse({
					code: 200,
					data: [{ key: 'TrackSwitch', component: 'Select', default: 0, feature: [{ label: 'Off', value: 0 }] }],
				})
			}
			if (address.includes('/panel-ability?panel=Base2')) {
				return jsonResponse({ code: 200, data: [{ key: 'autoZoomEnableChk', component: 'Switch', default: 1 }] })
			}
			const body = requestBody(init)
			if (address.endsWith('/base1/get')) return jsonResponse({ code: 200, data: [{ key: 'TrackSwitch', value: 1 }] })
			if (address.endsWith('/base2/get')) {
				expect(body).toEqual({ keys: ['autoZoomEnableChk'] })
				return jsonResponse({ code: 200, data: [{ key: 'autoZoomEnableChk', value: 0 }] })
			}
			if (address.endsWith('/status/get')) return jsonResponse({ code: 200, data: [{ key: 'trackheight', value: 80 }] })
			throw new Error(`Unexpected request: ${address}`)
		})
		const api = new CameraWebApi(
			'10.201.0.50',
			{ username: 'admin', password: 'secret' },
			{ log: vi.fn(), updateStatus: vi.fn(), trackingSchemaUpdated: schema, trackingValuesUpdated: values },
			fetcher,
		)

		await api.refreshTracking()
		expect(schema).toHaveBeenCalledWith([
			expect.objectContaining({ key: 'TrackSwitch' }),
			expect.objectContaining({ key: 'autoZoomEnableChk' }),
			expect.objectContaining({ key: 'trackheight' }),
		])
		expect(values).toHaveBeenCalledWith({
			base1_trackswitch: 1,
			base2_autozoomenablechk: 0,
			base1_trackheight: 80,
		})
	})

	test('merges a changed Base2 value into the complete tracking configuration', async () => {
		const requests: Array<{ url: string; body: unknown }> = []
		const abilities = [
			{ key: 'autoZoomEnableChk', component: 'Switch', default: 1 },
			{ key: 'trackSpeed', component: 'Slider', default: 5, feature: { min: 1, max: 10, step: 1 } },
		]
		const fetcher = vi.fn<typeof fetch>(async (url, init) => {
			const address = requestUrl(url)
			const body = requestBody(init)
			requests.push({ url: address, body })
			if (address.endsWith('/auth/login')) return jsonResponse({ code: 200, data: { token: 'token' } })
			if (address.includes('/panel-ability?panel=Base1')) return jsonResponse({ code: 200, data: [] })
			if (address.includes('/panel-ability?panel=Base2')) return jsonResponse({ code: 200, data: abilities })
			if (address.endsWith('/base2/get')) {
				return jsonResponse({
					code: 200,
					data: [
						{ key: 'autoZoomEnableChk', value: 1 },
						{ key: 'trackSpeed', value: 5 },
					],
				})
			}
			if (address.endsWith('/status/get')) return jsonResponse({ code: 200, data: [] })
			if (address.endsWith('/base2/set')) return jsonResponse({ code: 200, data: [] })
			throw new Error(`Unexpected request: ${address}`)
		})
		const api = new CameraWebApi(
			'10.201.0.50',
			{ username: 'admin', password: 'secret' },
			{ log: vi.fn(), updateStatus: vi.fn() },
			fetcher,
		)
		await api.refreshTracking()
		const fields = normalizeTrackingAbilities('Base2', abilities)
		const autoZoom = fields[0]
		if (autoZoom === undefined) throw new Error('missing auto zoom field')
		await api.setTrackingValue(autoZoom, 0)

		expect(requests.find(({ url }) => url.endsWith('/base2/set'))?.body).toEqual({
			autoZoomEnableChk: '0',
			trackSpeed: '5',
		})
	})
})
