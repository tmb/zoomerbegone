import express from 'express'
import http from 'http'
import socketio from 'socket.io'
import ZoomManager from './zoomManager'
import * as db from './meetingDb'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'

dotenv.config()

const app = express()
const server = http.Server(app)
const io = socketio(server)
const zm = new ZoomManager(io)

app.use(bodyParser.json())

app.get('/', async (req, res) => {
    res.status(200)
})

app.get('/meeting', async (req, res) => {
    let meetings = await db.getAllMeetings()

    if (meetings == null) {
        return res.json([])
    }

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

app.get('/meeting/register', async (req, res) => {
    // register for the meeting
})

process.on('SIGINT', async function() {
    console.log('stopping..')
    await zm.stop()
    process.exit()
})

;(async () => {
    await zm.initialConfig((meetingId, data) => {
        // on participant join
        console.log(data)
        console.log(meetingId)
    })
    server.listen(3000)
    console.log('server started!')
})()
