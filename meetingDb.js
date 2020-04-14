import Redis from 'ioredis'
const redis = new Redis()

// {
// 	"meetingId": "1234567890",
// 	"participants": [
// 		{
// 			"name": "Theo Bleier"
// 			"email": "me@tmb.sh",
// 			"uniqueId": "abCdsdf",
// 			"zoomId": "1234576",
// 			"joined": false
// 		}
// 	],
// 	"creator": "Theo Bleier"
// }

export async function createMeeting(meetingId, creator) {
	let meeting = {
		meetingId: meetingId,
		participants: [],
		creator: creator,
		joined: false,
	}
	await redis.set(meetingId, JSON.stringify(meeting))

	return meeting
}

export async function getAllMeetings() {
	let keys = await redis.keys('*')

	console.log('ran')

	if (keys.length == 0) {
		return null
	}

	let meetings = []

	for (let i = 0; i < keys.length; i++) {
		let key = keys[i]
		let meeting = await getMeeting(key)
		meetings.push(meeting)
	}

	return meetings
}

export async function getMeeting(meetingId) {
	let meeting
	try {
		meeting = await redis.get(meetingId)
	} catch (e) {
		return null
	}
	return JSON.parse(meeting)
}

export async function saveMeeting(meeting) {
	await redis.set(meeting.meetingId, JSON.stringify(meeting))
	return meeting
}

export async function createParticipant(meetingId, name, email, uniqueId) {
	let meeting = await getMeeting(meetingId)

	if (meeting == null) {
		return false
	}

	meeting.participants.push({
		name: name,
		email: email,
		uniqueId: uniqueId,
		zoomId: null,
		joined: false,
	})

	await saveMeeting(meeting)
}

export async function getParticipantByUniqueId(meetingId, uniqueId) {
	let meeting = await getMeeting(meetingId)

	if (meeting == null) {
		return null
	}

	meeting.participants.forEach((p) => {
		if (p.uniqueId == uniqueId) {
			return p
		}
	})

	return null
}

export async function getParticipantsByEmail(email) {
	let meetings = await getAllMeetings()
	let ptcps = []

	if (meetings == null) {
		return null
	}

	meetings.forEach((m) => {
		m.participants.forEach((p) => {
			if (p.email == email) {
				ptcps.push(p)
			}
		})
	})

	if (ptcps.length == 0) {
		return null
	}

	return ptcps
}

export async function saveParticipant(participant, meetingId) {
	let meeting = await getMeeting(meetingId)

	if (meeting == null) {
		return false
	}

	for (let i = 0; i < meeting.participants; i++) {
		let pt = meeting.participants[i]

		if (pt.uniqueId == participant.uniqueId) {
			meeting.participants[i] = participant
			await saveMeeting(meeting)
			return true
		}
	}

	return false
}
