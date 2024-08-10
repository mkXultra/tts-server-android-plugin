let apiKey = ttsrv.userVars["apiKey"]
let sampleRate = 16000

let PluginJS = {
    "name": "OpenAItts",
    "pluginId": "mk.openai.tts",
    "author": "mkXultra",
    "description": "OpenAI Text-to-Speech API",
    "version": 1,

    "vars": {
        apiKey: {label: "API-KEY", hint: "OpenAI API-KEY"},
    },

    "getAudio": function (text, locale, voice, rate, volume, pitch) {
        return getAudio(text, voice, rate, volume, pitch)
    },
}

function getAudio(text, voice, rate, volume, pitch) {
    logger.i("getAudio")
    logger.i("rate: " + rate)
    if (voice === null || voice === "") {
        voice = "alloy"
    }
    if (rate === null || rate === "") {
        rate = 1
    }

    // Ensure rate is within the valid range
    rate = Math.max(0.25, Math.min(4.0, parseFloat(rate)))

    let reqHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
    }

    let body = {
        "model": "tts-1",
        "input": text,
        "voice": voice,
        "response_format": "opus",
        "speed": rate
    }
    let str = JSON.stringify(body)
    let resp = ttsrv.httpPost('https://api.openai.com/v1/audio/speech', str, reqHeaders)

    if (resp.isSuccessful()) {
        return resp.body().byteStream()
    } else {
        throw "FAILED: status=" + resp.code()
    }
}

let EditorJS = {
    'getAudioSampleRate': function (locale, voice) {
         let audio = PluginJS.getAudio('test', locale, voice, 50, 50, 50)
         return ttsrv.getAudioSampleRate(audio)
//        return 22050
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