let joined = false
let meeting_number = ''
let ptcpInterval
let currentPtcp = null

ZoomMtg.preLoadWasm()
ZoomMtg.prepareJssdk()

function initAndJoinMeeting(meetConfig, signature) {
	return new Promise((resolve, reject) => {
		ZoomMtg.init({
			leaveUrl: meetConfig.leaveUrl,
			isSupportAV: false,
			success: (success) => {
				ZoomMtg.join({
					signature: signature,
					apiKey: meetConfig.apiKey,
					meetingNumber: meetConfig.meetingNumber,
					userName: meetConfig.userName,
					success: (res) => {
						console.log(res)
						joined = true
						resolve()
					},
					error: (res) => {
						console.log(res)
						reject(res)
					},
				})
			},
			error: (error) => {
				console.log(error)
				reject(error)
			},
		})
	})
}

let socket = io('http://localhost:3000')

socket.on('connect', () => {
	console.log('[client] notifying server of readiness')
	socket.emit('ready', (data) => {
		console.log(data)
	})
})

socket.on('join', async (meetConfig, signature, callback) => {
	console.log('[client] got meeting ID ' + meetConfig.meetingNumber)
	console.log('[client] attempting join')

	await initAndJoinMeeting(meetConfig, signature)

	console.log('[client] succesfully joined meeting')
	meeting_number = meetConfig.meetingNumber
	callback(true)
})
socket.on('leave', (callback) => {
	if (joined) {
		console.log('leaving')
		ZoomMtg.leaveMeeting()
		callback(true)
	} else {
		callback(false)
	}
})

socket.on('ptcpCallback', (callback) => {
	ZoomMtg.getAttendeeslist({
		success: (data) => {
			currentPtcp = data.result.attendeesList
		},
	})
	ptcpInterval = setInterval(() => {
		ZoomMtg.getAttendeeslist({
			success: function(data) {
				let newer = data.result.attendeesList

				if (currentPtcp.length != newer.length) {
					let old = currentPtcp
					currentPtcp = newer

					let ou = old.map((x) => x.userId)
					let nu = newer.map((x) => x.userId)

					// people left
					let left = ou.filter((x) => !nu.includes(x))

					// people joined
					let joined = nu.filter((x) => !ou.includes(x))

					left.forEach((l) => {
						let obj = {}
						old.forEach((o) => {
							if (o.userId == l) {
								obj = o
							}
						})
						console.log('left')
						console.log(obj)
						socket.emit(
							'participantLeave',
							meeting_number,
							obj,
							(receive) => {
								console.log(receive)
							}
						)
					})

					joined.forEach((j) => {
						let obj = {}
						newer.forEach((o) => {
							if (o.userId == j) {
								obj = o
							}
						})
						socket.emit(
							'participantJoin',
							meeting_number,
							obj,
							(receive) => {
								console.log(receive)
							}
						)
					})

					return
				}
			},
		})
	}, 100)
	callback(true)
})

socket.on('participants', (callback) => {
	if (joined) {
		ZoomMtg.getAttendeeslist({
			success: (data) => {
				callback(data.result.attendeesList)
			},
		})
	} else {
		callback(false)
	}
})

socket.on('kick', (userId, callback) => {
	if (joined) {
		ZoomMtg.expel({
			userId: userId,
		})
		callback(true)
	} else {
		callback(false)
	}
})

socket.on('release', (userId, callback) => {
	if (joined) {
		ZoomMtg.putOnHold({
			userId: userId,
			hold: false,
		})
		callback(true)
	} else {
		callback(false)
	}
})

socket.on('hold', (userId, callback) => {
	if (joined) {
		ZoomMtg.putOnHold({
			userId: userId,
			hold: true,
		})
		callback(true)
	} else {
		callback(false)
	}
})

socket.on('rename', (userId, oldName, newName, callback) => {
	if (joined) {
		ZoomMtg.rename({
			userId: userId,
			oldName: oldName,
			newName: newName,
		})
		callback(true)
	} else {
		callback(false)
	}
})

socket.on('mute', (userId, callback) => {
	if (joined) {
		ZoomMtg.mute({
			userId: userId,
			mute: true,
		})
		callback(true)
	} else {
		callback(false)
	}
})
