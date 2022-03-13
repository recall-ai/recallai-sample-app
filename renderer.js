const apiBasePath = "https://staging.recall.ai/api/v1"

const apiTokenInputStep = document.getElementById("apiTokenInputStep")
const recordMeetingStep = document.getElementById("recordMeetingStep")
const botInCallStep = document.getElementById("botInCallStep")

function setStep(step) {
    if (step == 0) {
        apiTokenInputStep.style = "display: block;"
        recordMeetingStep.style = "display: none;"
        botInCallStep.style = "display: none;"
    }
    else if (step == 1) {
        apiTokenInputStep.style = "display: none;"
        recordMeetingStep.style = "display: block;"
        botInCallStep.style = "display: none;"
    }
    else if (step == 2) {
        apiTokenInputStep.style = "display: none;"
        recordMeetingStep.style = "display: none;"
        botInCallStep.style = "display: block;"
    }
}
setStep(0)

//
// API Token Input Step
//
async function validateApiToken(token) {
    const res = await fetch(
        apiBasePath + '/bot/', 
        {
            method: 'GET', 
            headers: {'Authorization': 'Token ' + token}
        }
    )
    return res.ok
}

let apiToken = null;
const apiTokenInput = document.getElementById("apiTokenInput")
const apiTokenValidateBtn = document.getElementById("apiTokenValidateBtn")
apiTokenValidateBtn.onclick = async function () {
    if(await validateApiToken(apiTokenInput.value)) {
        apiToken = apiTokenInput.value;
        setStep(1)
    }
    else {
        alert("Invalid API Token.")
    }
}

//
// Record Meeting Step
//
let botId = null;
async function sendBotToCall(token, meetingUrl) {
    const res = await fetch(
        apiBasePath + '/bot/',
        {
            method: 'POST',
            headers: {
                'Authorization': 'Token ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ meeting_url: meetingUrl })
        }
    )
    return [res.ok, await res.json()]
}

const meetingUrlInput = document.getElementById("meetingUrlInput")
const recordMeetingBtn = document.getElementById("recordMeetingBtn")
recordMeetingBtn.onclick = async function () {
    if (!apiToken) {
        alert("Validate your API Token first!");
        return;
    }
    
    const [success, data] = await sendBotToCall(apiToken, meetingUrlInput.value)
    if (success) {
        botId = data.id;
        document.getElementById('botIdInput').value = data.id;
        startPollingBotStatus(apiToken, data.id)
        setStep(2);
    }
    else {
        alert(data.detail)
    }
}

//
// Bot In-Call Step
//
async function removeBotFromCall(token, botId) {
    const res = await fetch(
        apiBasePath + '/bot/' + botId + '/leave_call/',
        {
            method: 'POST',
            headers: { 'Authorization': 'Token ' + token },
        }
    )
    return [res.ok, await res.json()]
}
const removeBotBtn = document.getElementById("removeBotBtn")
removeBotBtn.onclick = async function() {
    const [success, data] = await removeBotFromCall(apiToken, botId)
    if (success)  {
        alert("Bot removed from call.")
    }
    else {
        alert(data.detail)
    }
}

function startPollingBotStatus(token, botId) {
    const botStatusInput = document.getElementById("botStatusInput");
    const transcriptionTextArea = document.getElementById("transcriptionTextarea");
    const botVideoUrlInput = document.getElementById("botVideoUrlInput");

    async function updateBotStatus() {
        const data = await getBot(token, botId)
        if (!data) return;
        botVideoUrlInput.value = data.video_url;

        const mostRecentStatus = data.events.sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at)
        })[0]
        if (!mostRecentStatus) return;
        botStatusInput.value = mostRecentStatus.code;
    }

    async function updateBotTranscript() {
        const data = await getBotTranscript(token, botId)
        if (!data) return

        transcriptionTextArea.value = renderTranscript(data)
    }

    function renderTranscript(transcript) {
        const renderedSections = transcript.map((section) => {
            return (section.speaker || "Unknown Speaker") + ': ' + section.words.map((wordData) => wordData.text).join(' ')
        })
        return renderedSections.join('\n')
    }

    const i1 = setInterval(updateBotStatus, 1000)
    const i2 = setInterval(updateBotTranscript, 1000)

    return () => {
        clearInterval(i1);
        clearInterval(i2);
    }
}

async function getBot(token, botId) {
    const res = await fetch(
        apiBasePath + '/bot/' + botId,
        {
            method: 'GET',
            headers: {
                'Authorization': 'Token ' + token,
                'Content-Type': 'application/json'
            },
        }
    )
    
    const data = await res.json()
    if (res.ok) {
        return data
    }
    else {
        console.error(data)
    }
}

async function getBotTranscript(token, botId) {
    const res = await fetch(
        apiBasePath + '/bot/' + botId + '/transcript/',
        {
            method: 'GET',
            headers: {
                'Authorization': 'Token ' + token,
                'Content-Type': 'application/json'
            },
        }
    )

    const data = await res.json()
    if (res.ok) {
        return data
    }
    else {
        console.error(data)
    }
}
