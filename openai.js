let apiKey = ttsrv.userVars["apiKey"]

let PluginJS = {
    "name": "OpenAItts",
    "pluginId": "mk.openai.tts",
    "author": "mkXultra",
    "description": "OpenAI Text-to-Speech API",
    "version": 1,

    "vars": {
        apiKey: {label: "API Key"}
    },

    "getAudio": function (text, locale, voice, rate, volume, pitch) {
        return getAudio(text, voice, rate, volume, pitch)
    },
}

function getAudio(text, voice, rate, volume, pitch) {
    if (voice === null || voice === "") {
        voice = "alloy"
    }

    let url = "wss://api.openai.com/v1/audio/speech"
    let ws = null

    let pos = new java.io.PipedOutputStream()

    function connectWebSocket() {
        ws = JWebSocket(new java.lang.String(url), {
            "Authorization": "Bearer " + apiKey,
            "Content-Type": "application/json"
        })

        ws.onOpen = function (response) {
            logger.i("WebSocket opened: " + response)
            sendMessage()
        }

        ws.onFailure = function (t) {
            logger.e("WebSocket failure: " + t)
            pos.close()
            throw "WebSocket failure: " + t
        }

        ws.onTextMessage = function (str) {
            let result = JSON.parse(str)
            if (result.audio) {
                let audio = ttsrv.base64DecodeToBytes(result.audio)
                pos.write(audio)
            }
            if (result.status === "done") {
                pos.close()
                ws.close(1000)
            }
        }

        ws.onClosing = function (code, reason) {
            logger.i("WebSocket closing: " + code + " " + reason)
        }

        ws.onClosed = function (code, reason) {
            logger.i("WebSocket closed: " + code + " " + reason)
            pos.close()
        }

        ws.connect()
    }

    function sendMessage() {
        let message = JSON.stringify({
            model: "tts-1",
            input: text,
            voice: voice,
            speed: rate
        })
        ws.send(message)
    }

    connectWebSocket()

    return new java.io.PipedInputStream(pos)
}

let EditorJS = {
    "getAudioSampleRate": function (locale, voice) {
        return sampleRate
    },

    "getLocales": function () {
        return ["en-US"]
    },

    "getVoices": function (locale) {
        return {
            "alloy": "Alloy",
            "echo": "Echo",
            "fable": "Fable",
            "onyx": "Onyx",
            "nova": "Nova",
            "shimmer": "Shimmer"
        }
    },

    "onLoadData": function () {},

    "onLoadUI": function (ctx, linerLayout) {
        let cb = new CheckBox(ctx)
        cb.setText("Background music (only supported for special voices)")
        cb.setChecked(ttsrv.tts.data["bgm"] == "true")
        cb.setOnCheckedChangeListener(function (view, isChecked) {
            ttsrv.tts.data["bgm"] = isChecked + ''
        })
        linerLayout.addView(cb)
        ttsrv.setMargins(cb, 0, 8, 10, 0)
    },

    "onVoiceChanged": function (locale, voiceCode) {

    }
}