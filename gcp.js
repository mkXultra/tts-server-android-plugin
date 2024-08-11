let apiKey = ttsrv.userVars["apiKey"]
let sampleRate = 16000

let PluginJS = {
    "name": "GCPTTS",
    "pluginId": "mk.gcp.tts",
    "author": "mkXultra",
    "description": "Google Cloud Text-to-Speech API",
    "version": 1,

    "vars": {
        apiKey: {label: "API-KEY", hint: "Google Cloud API-KEY"},
    },

    "getAudio": function (text, locale, voice, rate, volume, pitch) {
        return getAudio(text, voice, rate, volume, pitch)
    },
}

function getAudio(text, voice, rate, volume, pitch) {
    let speed = rate
    if (voice === null || voice === "") {
        voice = "ja-JP-Wavenet-A"
    }
    if (rate === null || rate === "" || rate === 0) {
        speed = 1
    } else{
        // kindle reader speed is 1 = 20%
        speed = (parseFloat(rate) / 20)
        // Ensure rate is within the valid range
        speed = Math.max(0.25, Math.min(4.0, parseFloat(speed)))
    }

    let reqHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Goog-Api-Key': apiKey
    }

    let body = {
        "input": {
            "text": text
        },
        "voice": {
            "languageCode": "ja-JP",
            "name": "ja-JP-Wavenet-A"
        },
        "audioConfig": {
            "audioEncoding": "OGG_OPUS",
            "speakingRate": speed
        }
    }
    let str = JSON.stringify(body)
    let resp = ttsrv.httpPost('https://texttospeech.googleapis.com/v1/text:synthesize', str, reqHeaders)

    if (resp.isSuccessful()) {
        let body = resp.body();
        logger.i("Body type:"+ typeof body);
        logger.i("Body constructor:"+ body.constructor.name);
        logger.i("Body keys:"+ Object.keys(body));
        logger.i("Body length:"+ body.length);
        let audioContent = JSON.parse(resp.body().string()).audioContent;
        logger.i("audioContent: " + audioContent)
        return audioContent
    } else {
        throw "FAILED: status=" + resp.code() + " body=" + resp.body() + " params=" + "text=" + text + " voice=" + voice + " rate=" + rate + " volume=" + volume + " pitch=" + pitch
    }
}

let EditorJS = {
    'getAudioSampleRate': function (locale, voice) {
         let audio = PluginJS.getAudio('test', locale, voice, 20, 50, 50)
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