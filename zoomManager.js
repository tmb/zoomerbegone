import { generateMeetConfig, generateSignature } from './zoomUtils'
import puppeteer from 'puppeteer'

class ZoomManager {
	constructor(socketio) {
		this.io = socketio
		this.clients = []
	}

	async initialConfig(pcpsCallback) {
		this.browser = await puppeteer.launch({ headless: false })
		this.pcpsCallback = pcpsCallback

		this.io.on('connection', (socket) => {
			socket.on('ready', (callback) => {
				// hit the client
				callback('[server] ack')

				// store socket
				this.clients.push({
					id: socket.id,
					meetingId: null,
					socket: socket,
				})
			})

			socket.on('participantJoin', (meetingId, data, callback) => {
				this.pcpsCallback(meetingId, data)
				callback('[server] received join')
			})
		})
	}

	async createClient() {
		return new Promise(async (resolve, reject) => {
			let count = this.clients.length

			const page = await this.browser.newPage()
			await page.goto('file://' + __dirname + '/web/index.html')

			let interval = setInterval(() => {
				if (count < this.clients.length) {
					resolve()
					clearInterval(interval)
				}
			}, 100)
		})
	}

	async getEmptyClient() {
		// find existing socket w/o meeting ID
		if (this.clients.length > 0) {
			for (let i = 0; i < this.clients.length; i++) {
				let client = this.clients[i]
				if (client.meetingId == null) {
					return client
				}
			}
		}

		// make a new one if it doesn't exist
		await this.createClient()

		// find again
		for (let i = 0; i < this.clients.length; i++) {
			let client = this.clients[i]
			if (client.meetingId == null) {
				return client
			}
		}

		return null
	}

	async joinMeeting(meetingId) {
		return new Promise(async (resolve, reject) => {
			let meetConfig = generateMeetConfig(meetingId)
			let signature = generateSignature(meetingId)

			let client = await this.getEmptyClient()
			client.meetingId = meetingId

			client.socket.emit('join', meetConfig, signature, (data) => {
				if (data == true) {
					resolve()
				} else {
					console.log(data)
					reject()
				}
			})
		})
	}

	findClient(meetingId) {
		for (let i = 0; i < this.clients.length; i++) {
			let client = this.clients[i]

			if (client.meetingId == meetingId) {
				return client
			}
		}

		return null
	}

	// methods on already joined meetings

	async setUpParticipantsCallbackForMeeting(meetingId) {
		let client = this.findClient(meetingId)

		return new Promise((resolve, reject) => {
			client.socket.emit('ptcpCallback', (data) => {
				if (data) {
					resolve()
				} else {
					reject()
				}
			})
		})
	}
}

export default ZoomManager
