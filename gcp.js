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
        manualLangSpeed: {label: "Manual Language Speed", hint: "Manual Language Speed"},
    },

    "getAudio": function (text, locale, voice, rate, volume, pitch) {
        return getAudio(text, voice, rate, volume, pitch)
    },
}

function base64ToByteArray(base64) {
    var decoder = java.util.Base64.getDecoder();
    return decoder.decode(base64);
}

function isEnglish(text) {
  // 日本語の文字コード範囲
  const japaneseRanges = [
    { start: 0x3040, end: 0x309F }, // ひらがな
    { start: 0x30A0, end: 0x30FF }, // カタカナ
    { start: 0x4E00, end: 0x9FFF }  // 漢字
  ];

  // 文字列内の各文字をチェック
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    
    // 日本語の文字コード範囲内にあるかチェック
    for (let range of japaneseRanges) {
      if (charCode >= range.start && charCode <= range.end) {
        return false;
      }
    }
  }

  // 日本語の文字が見つからなかった場合は英語と判断
  return true;
}

function getAudio(text, voice, rate, volume, pitch) {
    let speed = rate
    let jpSpeed = 1
    if (voice === null || voice === "") {
        voice = "en-US-Journey-F"
    }
    if (rate === null || rate === "" || rate === 0) {
        speed = 1
    } else{
        // kindle reader speed is 1 = 20%
        speed = (parseFloat(rate) / 20)
        // Ensure rate is within the valid range
        speed = Math.max(0.25, Math.min(4.0, parseFloat(speed)))
    }

    if(manualLangSpeed < 3){
        jpSpeed = manualLangSpeed
    }

    let reqHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Goog-Api-Key': apiKey
    }

    if (isEnglish(text)) {
        body = {
            "input": {
                "text": text
            },
            "voice": {
                "languageCode": "en-US",
                "name": voice
            },
            "audioConfig": {
                "audioEncoding": "OGG_OPUS",
                "speakingRate": speed
            }
        }
    }else{
        body = {
            "input": {
                "text": text
            },
            "voice": {
                "languageCode": "ja-JP",
                "name": "ja-JP-Wavenet-A"
            },
            "audioConfig": {
                "audioEncoding": "OGG_OPUS",
                "speakingRate": jpSpeed
            }
        }
    }
    let str = JSON.stringify(body)
    let resp = ttsrv.httpPost('https://texttospeech.googleapis.com/v1/text:synthesize', str, reqHeaders)

    if (resp.isSuccessful()) {
        let audioContent = JSON.parse(resp.body().string()).audioContent;
        return base64ToByteArray(audioContent)
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
            // default
            "en-US-Journey-F": "en-US-Journey-F",

            "en-US-Journey-D": "en-US-Journey-D",
            "en-US-Journey-O": "en-US-Journey-O",
            "en-US-Neural2-A": "en-US-Neural2-A",
            "en-US-Neural2-C": "en-US-Neural2-C",
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