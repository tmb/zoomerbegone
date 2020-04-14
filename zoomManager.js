import { generateMeetConfig, generateSignature } from './zoomUtils'
import puppeteer from 'puppeteer'

// {
// 	id: socket.id,
// 	meetingId: null,
// 	socket: socket,
// 	page: page
// }

class ZoomManager {
	constructor(socketio) {
		this.io = socketio
		this.clients = []
	}

	async initialConfig(pcpsCallback) {
		this.browser = await puppeteer.launch({ headless: true })
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

	async stop() {
		await this.browser.close()
	}

	async createClient() {
		return new Promise(async (resolve, reject) => {
			let count = this.clients.length

			console.log('opening new page')

			const page = await this.browser.newPage()
			await page.goto('file://' + __dirname + '/web/index.html')

			let interval = setInterval(() => {
				if (count < this.clients.length) {
					console.log('new client made and connected')
					// this is an incredibly shitty way of implementing this—we should be setting the page title and checking
					this.clients[this.clients.length - 1].page = page
					clearInterval(interval)
					console.log('new client made and connected')
					resolve()
				}
			}, 100)

			let timeout = setTimeout(() => {
				clearInterval(interval)
				clearTimeout(timeout)
				reject()
			}, 5000)
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
		console.log('getempty client making new')
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

			console.log(meetConfig)
			console.log(signature)

			let client = await this.getEmptyClient()
			client.meetingId = meetingId

			console.log('client received')
			console.log(client)

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

	removeClient(meetingId) {
		for (let i = 0; i < this.clients.length; i++) {
			let client = this.clients[i]

			if (client.meetingId == meetingId) {
				this.clients.splice(i, 1)
				return true
			}
		}

		return null
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

	async leaveMeeting(meetingId) {
		return new Promise((resolve, reject) => {
			let client = this.findClient(meetingId)

			if (client == null) {
				resolve(false)
			}

			client.socket.emit('leave', async (data) => {
				if (data) {
					setTimeout(async () => {
						await client.page.close()
						this.removeClient(meetingId)
						resolve()
					}, 1500)
				} else {
					reject()
				}
			})
		})
	}
}

export default ZoomManager
