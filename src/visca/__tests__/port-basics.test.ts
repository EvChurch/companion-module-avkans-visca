import { InstanceStatus } from '@companion-module/base'
import { describe, test } from 'vitest'
import { OnScreenDisplayClose, OnScreenDisplayInquiry, OnScreenDisplayOpen } from '../../camera/osd.js'
import { ModuleDefinedCommand } from '../command.js'
import {
	ACKCompletion,
	Completion,
	OnScreenDisplayCloseBytes,
	OnScreenDisplayInquiryBytes,
	SyntaxErrorBytes,
} from './camera-interactions/bytes.js'
import {
	CameraExpectIncomingBytes,
	CameraReplyBytes,
	CommandFailed,
	CommandSucceeded,
	InquiryFailed,
	InquirySucceeded,
	SendCommand,
	SendInquiry,
	SendRawInquiry,
	RawInquirySucceeded,
} from './camera-interactions/interactions.js'
import {
	BlameModuleMatcher,
	CameraReportedSyntaxErrorMatcher,
	MatchVISCABytes,
} from './camera-interactions/matchers.js'
import { RunCameraInteractionTest } from './camera-interactions/run-test.js'

describe('VISCA port sending/receiving basics', () => {
	test('LV20N framed command succeeds over TCP', async () => {
		return RunCameraInteractionTest(
			[
				SendCommand(OnScreenDisplayClose, 'osd-close'),
				CameraExpectIncomingBytes([
					0x01,
					0x00,
					0x00,
					OnScreenDisplayCloseBytes.length,
					0x00,
					0x00,
					0x00,
					0x01,
					...OnScreenDisplayCloseBytes,
				]),
				CameraReplyBytes([0x01, 0x11, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, ...Completion(1)]),
				CommandSucceeded('osd-close'),
			],
			InstanceStatus.Ok,
			'visca-over-ip',
		)
	})

	test('LV20N framed responses are matched by sequence number', async () => {
		return RunCameraInteractionTest(
			[
				SendCommand(OnScreenDisplayOpen, 'osd-open'),
				SendCommand(OnScreenDisplayClose, 'osd-close'),
				CameraExpectIncomingBytes([
					0x01,
					0x00,
					0x00,
					6,
					0x00,
					0x00,
					0x00,
					0x01,
					0x81,
					0x01,
					0x06,
					0x06,
					0x02,
					0xff,
					0x01,
					0x00,
					0x00,
					6,
					0x00,
					0x00,
					0x00,
					0x02,
					...OnScreenDisplayCloseBytes,
				]),
				CameraReplyBytes([0x01, 0x11, 0x00, 0x03, 0x00, 0x00, 0x00, 0x02, ...Completion(1)]),
				CommandSucceeded('osd-close'),
				CameraReplyBytes([0x01, 0x11, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, ...Completion(1)]),
				CommandSucceeded('osd-open'),
			],
			InstanceStatus.Ok,
			'visca-over-ip',
		)
	})

	test('simple command succeeding', async () => {
		return RunCameraInteractionTest(
			[
				SendCommand(OnScreenDisplayClose, 'osd-close'),
				CameraExpectIncomingBytes(OnScreenDisplayCloseBytes), // osd-close
				CameraReplyBytes(ACKCompletion(1)), // osd-close
				CommandSucceeded('osd-close'),
			],
			InstanceStatus.Ok,
		)
	})

	test('simple command failing', async () => {
		return RunCameraInteractionTest(
			[
				SendCommand(OnScreenDisplayClose, 'osd-close'),
				CameraExpectIncomingBytes(OnScreenDisplayCloseBytes), // osd-close
				CameraReplyBytes(SyntaxErrorBytes),
				CommandFailed(
					[CameraReportedSyntaxErrorMatcher, MatchVISCABytes(OnScreenDisplayCloseBytes), BlameModuleMatcher],
					'osd-close',
				),
			],
			InstanceStatus.Ok,
		)
	})

	test('simple inquiry succeeding', async () => {
		return RunCameraInteractionTest(
			[
				SendInquiry(OnScreenDisplayInquiry, 'osd-inquiry'),
				CameraExpectIncomingBytes(OnScreenDisplayInquiryBytes), // osd-inquiry
				CameraReplyBytes([0x90, 0x50, 0x02, 0xff]), // osd-inquiry
				InquirySucceeded({ state: 'open' }, 'osd-inquiry'),
			],
			InstanceStatus.Ok,
		)
	})

	test('simple inquiry failing', async () => {
		return RunCameraInteractionTest(
			[
				SendInquiry(OnScreenDisplayInquiry, 'osd-inquiry'),
				CameraExpectIncomingBytes(OnScreenDisplayInquiryBytes), // osd-inquiry
				CameraReplyBytes(SyntaxErrorBytes), // osd-inquiry
				InquiryFailed(
					[CameraReportedSyntaxErrorMatcher, MatchVISCABytes(OnScreenDisplayInquiryBytes), BlameModuleMatcher],
					'osd-inquiry',
				),
			],
			InstanceStatus.Ok,
		)
	})

	test('captures a variable-length raw inquiry response over VISCA over IP', async () => {
		const inquiry = [0x81, 0x09, 0x08, 0x07, 0xff] as const
		const response = [0x90, 0x50, ...Buffer.from('10.0.3.112:255.255.255.0:10.0.3.1', 'ascii'), 0xff]
		return RunCameraInteractionTest(
			[
				SendRawInquiry(inquiry, 'ip-info'),
				CameraExpectIncomingBytes([0x01, 0x10, 0x00, inquiry.length, 0, 0, 0, 1, ...inquiry]),
				CameraReplyBytes([0x01, 0x11, 0x00, response.length, 0, 0, 0, 1, ...response]),
				RawInquirySucceeded(response, 'ip-info'),
			],
			InstanceStatus.Ok,
			'visca-over-ip',
		)
	})

	test('accepts addressed heartbeat responses', async () => {
		const inquiry = [0x88, 0x09, 0x01, 0x01, 0xff] as const
		return RunCameraInteractionTest(
			[
				SendRawInquiry(inquiry, 'heartbeat'),
				CameraExpectIncomingBytes(inquiry),
				CameraReplyBytes([0xa0, 0x50, 0x01, 0xff]),
				RawInquirySucceeded([0xa0, 0x50, 0x01, 0xff], 'heartbeat'),
			],
			InstanceStatus.Ok,
		)
	})

	test('accepts the VISCA address-set broadcast response', async () => {
		const addressSet = new ModuleDefinedCommand([0x88, 0x30, 0x01, 0xff])
		return RunCameraInteractionTest(
			[
				SendCommand(addressSet, 'address-set'),
				CameraExpectIncomingBytes(addressSet.toBytes()),
				CameraReplyBytes([0x88, 0x30, 0x02, 0xff]),
				CommandSucceeded('address-set'),
			],
			InstanceStatus.Ok,
		)
	})
})
