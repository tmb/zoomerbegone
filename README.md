# Ostracizer

Ostracizer is a suite of software that allows you to easily implement automated waiting room functionality for Zoom. People can only join if they have registered for the meeting in advance and join with a custom username.

This enables you to have an "open meeting" (i.e: putting the link on social media), while enforcing that each person who joins has a unique email and can't join twice, making it much more difficult to cause havoc. 

It uses the Zoom Web SDK to create a headless Zoom client that is programatically controlled and can take various actions (i.e: letting people in from the waiting room) as if it were a real user.

## How to use

* Get a Zoom Pro account & create a JWT app [here](https://marketplace.zoom.us/develop/create)
* Run a Redis server
* Add the api key & secret into your environment as `ZOOM_API_KEY` and `ZOOM_API_SECRET` respectively
* `npm install`
* `npm run start` — the server will start on port 3000
* Create a Zoom meeting with waiting room enabled (you don't have to start it yet), then make a POST request to `/meeting` with  
```json
{
	"meetingId": "<Zoom Meeting ID>",
	"creator": "<your name>"
}
```
This will create a meeting entry with Ostracizer, allowing you to let people register for the meeting.
* Register people for the meeting by making a POST request to `/meeting/register` with  
```json
{
	"meetingId": "<Zoom Meeting ID>",
	"name": "<their preferred Zoom name>",
  "email": "<their email>"
  
}
```
This will register them as a participant and (in the future, currently unimplemented) email them a custom link which will set their Zoom name to contain a special ID that will automatically admit them to the call. Right now, you can obtain this link by making a GET request to `/meeting` which will return info about all meetings and participants (including their special links)

To expose this to the internet, I'd recommend using something like ngrok.

* When you've started the Zoom call, before anyone joins, make a POST request to `/meeting/join` with 
```json
{
	"meetingId": "<Zoom Meeting ID>",
}
```
Ostracizer will join your meeting with the username "bomber be gone" (a reference to Zoombombers)

* Give Ostracizer co-host permissions—this is necessary for it to admit people from the waiting room.
* Let people join your meeting! If they're joining with the custom link, Ostracizer will automatically admit them to the call without any intervention. If they try to join on two devices with the same custom link, they'll be banned from the room.


## Current bugs
- Registering a new participant doesn't perform a unique check on the email
- Not secure. Need to implement an API key scheme so that this can safely be exposed to the public internet




