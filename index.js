import express from 'express'
import http from 'http'
import socketio from 'socket.io'
import ZoomManager from './zoomManager'
import * as db from './meetingDb'
import * as utils from './utils'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import crypto from 'crypto'
import cors from 'cors'

dotenv.config()

const app = express()
const server = http.Server(app)
const io = socketio(server)
const zm = new ZoomManager(
    io,
    // on participant join
    async (meetingId, data) => {
        // on participant join
        let name = data.userName
        let userId = parseInt(data.userId)

        let matcher = /(?<=\|)(.*?)(?=\|)/g
        let uniqueId = name.match(matcher)[0]

        let meeting = await db.getMeeting(meetingId)
        let participant = await db.getParticipantByUniqueId(meetingId, uniqueId)

        if (participant == null) {
            return
        }

        if (meeting.moderate) {
            if (participant.joined) {
                participant.banned = true
                
                await zm.putIntoWaitingRoom(meetingId, userId)
                await zm.putIntoWaitingRoom(meetingId, participant.zoomId)

                participant.joined = false
                participant.zoomId = null
                await db.saveParticipant(participant, meetingId)
                return
            }

            if (participant.banned) {
                return
            }
            // let them into the meeting
            console.log('letting in')
            await zm.releaseFromWaitingRoom(meetingId, userId)

            // mark them as joined
            participant.joined = true
            participant.zoomId = userId
            await db.saveParticipant(participant, meetingId)

            // change their name
            // await zm.changeUserName(meetingId, name, participant.name)
        }
    },
    // on participant leave
    async (meetingId, data) => {
        let userId = parseInt(data.userId)
        let participant = await db.getParticipantByUniqueId(meetingId, uniqueId)

        if (participant == null) {
            return
        }

        if (participant.banned) {
            return
        }

        participant.joined = false
        participant.zoomId = null
        await db.saveParticipant(participant, meetingId)
    }
)

app.use(bodyParser.json())
app.use(cors())

app.get('/', async (req, res) => {
    return res.status(200)
})

app.get('/meeting', async (req, res) => {
    let meetings = await db.getAllMeetings()

    if (meetings == null) {
        return res.json([])
    }

    // add links to participants
    meetings.forEach((m) => {
        m.participants.forEach((p) => {
            p.joinLink = utils.generateJoinLink(m, p)
        })
    })

    return res.json(meetings)
})

app.post('/meeting', async (req, res) => {
    if (
        !req.body.hasOwnProperty('meetingId') ||
        !req.body.hasOwnProperty('creator')
    ) {
        res.json({
            error: 'Missing required property',
        })
    }

    let meeting = await db.createMeeting(req.body.meetingId, req.body.creator)

    return res.json({
        meeting,
    })
})

app.post('/meeting/join', async (req, res) => {
    if (!req.body.hasOwnProperty('meetingId')) {
        return res.json({
            error: 'Missing required property',
        })
    }

    let meeting = await db.getMeeting(req.body.meetingId)

    if (meeting == null) {
        return res.json({
            error: "Meeting doesn't exist",
        })
    }

    if (meeting.joined) {
        console.log('already joined')
        return res.json({
            error: "You're already in this meeting!",
        })
    }

    await zm.joinMeeting(meeting.meetingId)

    meeting.joined = true

    await zm.setUpParticipantsCallbackForMeeting(meeting.meetingId)
    await db.saveMeeting(meeting)

    return res.json(meeting)
})

app.post('/meeting/leave', async (req, res) => {
    if (!req.body.hasOwnProperty('meetingId')) {
        return res.json({
            error: 'Missing required property',
        })
    }

    let meeting = await db.getMeeting(req.body.meetingId)

    if (meeting == null) {
        return res.json({
            error: "Meeting doesn't exist",
        })
    }

    if (!meeting.joined) {
        return res.json({
            error: 'You must join the meeting first!',
        })
    }

    await zm.leaveMeeting(meeting.meetingId)

    meeting.joined = false

    await db.saveMeeting(meeting)

    return res.json(meeting)
})

app.post('/meeting/register', async (req, res) => {
    if (
        !req.body.hasOwnProperty('meetingId') ||
        !req.body.hasOwnProperty('name') ||
        !req.body.hasOwnProperty('email')
    ) {
        return res.json({
            error: 'Missing required property',
        })
    }

    let meeting = await db.getMeeting(req.body.meetingId)

    if (meeting == null) {
        return res.json({
            error: "Meeting doesn't exist",
        })
    }

    let uniqueId = crypto.randomBytes(8).toString('base64')

    let participant = await db.createParticipant(
        req.body.meetingId,
        req.body.name,
        req.body.email,
        uniqueId
    )

    // send email

    if (participant) {
        res.json({ success: true })
        return
    }

    res.json({ error: "Couldn't add you to the list!" })
})

app.post('/validate', async (req, res) => {
    if (!req.body.hasOwnProperty('token')) {
        return res.json({
            error: 'Missing required property'
        })
    }

    let token = req.body.token

    if (token == "zoomers") {
        return res.json({
            success: true
        })
    }

    return res.json({
        error: "invalid credentials"
    })
})

process.on('SIGINT', async function() {
    console.log('stopping..')
    await zm.stop()
    process.exit()
})
;(async () => {
    //   { userId: 16781312,
    // participantId: 135035,
    // userName: 'Theo Bleier',
    // muted: false,
    // audio: null,
    // isHost: false }
    await zm.initialConfig()
    server.listen(4500)
    console.log('server started!')
})()
