import express from 'express'
import http from 'http'
import socketio from 'socket.io'
import ZoomManager from './zoomManager'
import * as db from './meetingDb'
import dotenv from 'dotenv'

dotenv.config()

const server = http.Server(app)
const io = socketio(server)
const app = express()
const zm = new ZoomManager(io)

app.get('/', (req, res) => {
    res.status(200)
})

app.get('/meeting', (req, res) => {
    // return meetings in JSON  
})

app.post('/meeting', (req, res) => {
    // create meeting
})

app.get('/meeting/join', (req, res) => {
    // make the bot enter the channel
})

app.get('/meeting/:meetingId', (req, res) => {
    // register for the meeting
})

server.listen(3000)


;(async () => {
    await zm.initialConfig((meetingId, data) => {
        // on participant join
        console.log(data)
        console.log(meetingId)
    })
    await zm.joinMeeting('5133713370')
    
})()
