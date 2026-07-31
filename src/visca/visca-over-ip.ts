import type { Bytes } from '../utils/byte.js'

export type ViscaOverIpMessageType = 'command' | 'inquiry'

type ViscaOverIpResponsePacket = {
	readonly sequence: number
	readonly payload: number[]
}

const CommandPacketType = 0x00
const InquiryPacketType = 0x10
const ResponsePacketType = 0x11
const HeaderLength = 8

export function encodeViscaOverIpPacket(type: ViscaOverIpMessageType, sequence: number, payload: Bytes): number[] {
	if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0xffff_ffff) {
		throw new RangeError('VISCA over IP sequence must be an unsigned 32-bit integer')
	}
	if (payload.length > 0xffff) {
		throw new RangeError('VISCA over IP payload exceeds the 16-bit packet length')
	}

	const packetType = type === 'command' ? CommandPacketType : InquiryPacketType
	return [
		0x01,
		packetType,
		(payload.length >>> 8) & 0xff,
		payload.length & 0xff,
		(sequence >>> 24) & 0xff,
		(sequence >>> 16) & 0xff,
		(sequence >>> 8) & 0xff,
		sequence & 0xff,
		...payload,
	]
}

export class ViscaOverIpParser {
	readonly #receivedData: number[] = []

	push(data: Bytes | Uint8Array): ViscaOverIpResponsePacket[] {
		this.#receivedData.push(...data)
		const packets: ViscaOverIpResponsePacket[] = []

		while (this.#receivedData.length >= HeaderLength) {
			if (this.#receivedData[0] !== 0x01 || this.#receivedData[1] !== ResponsePacketType) {
				throw new Error('Unexpected VISCA over IP response type')
			}

			const payloadLength = (this.#receivedData[2] << 8) | this.#receivedData[3]
			const packetLength = HeaderLength + payloadLength
			if (this.#receivedData.length < packetLength) {
				break
			}

			const sequence =
				(this.#receivedData[4] * 0x01_00_00_00 +
					this.#receivedData[5] * 0x01_00_00 +
					this.#receivedData[6] * 0x01_00 +
					this.#receivedData[7]) >>>
				0
			this.#receivedData.splice(0, HeaderLength)
			packets.push({ sequence, payload: this.#receivedData.splice(0, payloadLength) })
		}

		return packets
	}
}
