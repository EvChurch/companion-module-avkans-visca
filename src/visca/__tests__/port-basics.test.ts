import { InstanceStatus } from '@companion-module/base'
import { describe, test } from 'vitest'
import { OnScreenDisplayClose, OnScreenDisplayInquiry, OnScreenDisplayOpen } from '../../camera/osd.js'
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
})
