import Redis from 'ioredis'
const redis = new Redis()

export function createMeeting(meetingId, creator) {
	redis.set(meetingId, {
		meetingId: meetingId,
		participants: {},
		creator: creator
	})
}

export function addParticipant(meetingId, name, email, id) {

}

export function fufillParticipant(meetingId, zoomId) {

}