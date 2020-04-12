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
		ZoomMtg.leaveMeeting()
		callback(true)
	} else {
		callback(false)
	}
})

socket.on('ptcpCallback', (callback) => {
	ptcpInterval = setInterval(() => {
		ZoomMtg.getAttendeeslist({
			success: function(data) {
				if (
					currentPtcp < data.result.attendeesList.length &&
					currentPtcp != null
				) {
					currentPtcp = data.result.attendeesList.length
					socket.emit(
						'participantJoin',
						meeting_number,
						data.result.attendeesList[
							data.result.attendeesList.length - 1
						],
						(receive) => {
							console.log(receive)
						}
					)
					return
				}
				currentPtcp = data.result.attendeesList.length
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
