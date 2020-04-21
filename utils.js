export function generateJoinLink(meeting, participant) {
	return `https://zoom.us/j/${meeting.meetingId}?uname=|${participant.uniqueId}| ${participant.name}`
}