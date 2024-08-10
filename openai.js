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

    let url = "https://api.openai.com/v1/audio/speech"
    let headers = {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
    }
    let body = JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voice,
        speed: rate
    })

    let response = ttsrv.httpPost(url, headers, body)
    if (response.code !== 200) {
        throw "OpenAI API error: " + response.code + " " + response.body
    }

    return new java.io.ByteArrayInputStream(response.body)
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