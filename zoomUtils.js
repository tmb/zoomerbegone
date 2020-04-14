import crypto from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

const apiKey = process.env.ZOOM_API_KEY
const apiSecret = process.env.ZOOM_API_SECRET

console.log(apiSecret)

function generateMeetConfig(meetingNumber) {
	const meetConfig = {
		apiKey: apiKey,
		meetingNumber: meetingNumber,
		leaveUrl: 'https://example.com',
		userName: 'bomber be gone',
		role: 0, // 1 for host; 0 for attendee or webinar
	}

	return meetConfig
}

function generateSignature(meetingNumber) {
	const role = 0 // join as participant

	// Prevent time sync issue between client signature generation and zoom
	const timestamp = new Date().getTime() - 30000
	const msg = Buffer.from(apiKey + meetingNumber + timestamp + role).toString(
		'base64'
	)
	const hash = crypto
		.createHmac('sha256', apiSecret)
		.update(msg)
		.digest('base64')
	const signature = Buffer.from(
		`${apiKey}.${meetingNumber}.${timestamp}.${role}.${hash}`
	).toString('base64')

	return signature
}

export { generateMeetConfig, generateSignature }
