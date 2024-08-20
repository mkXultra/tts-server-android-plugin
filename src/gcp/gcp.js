let apiKey = ttsrv.userVars["apiKey"]
let manualLangSpeed = ttsrv.userVars["manualLangSpeed"]
let defaultVoice = "en-US-Journey-F"
let jpDefaultVoice = "ja-JP-Wavenet-A"

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

function getGender(voiceCode) {
    let voices = EditorJS.getVoices("en-US");
    return voices[voiceCode] && voices[voiceCode].startsWith("MALE") ? "MALE" : "FEMALE";
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
    let charCode = text.charCodeAt(i);
    
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
        voice = defaultVoice
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
        const gender = getGender(voice);
        let jpFEMALEVoice = "ja-JP-Neural2-B"
        if (voice == defaultVoice){
            jpFEMALEVoice = jpDefaultVoice
        }
        let jpVoice = gender == "FEMALE" ? jpFEMALEVoice : "ja-JP-Neural2-D"
        body = {
            "input": {
                "text": text
            },
            "voice": {
                "languageCode": "ja-JP",
                "name": jpVoice
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
            "en-US-Journey-F": "FEMALE en-US-Journey-F",

            "en-US-Casual-K": "MALE en-US-Casual-K",
            "en-US-Journey-D": "MALE en-US-Journey-D",
            "en-US-Journey-F": "FEMALE en-US-Journey-F",
            "en-US-Journey-O": "FEMALE en-US-Journey-O",
            "en-US-Neural2-A": "MALE en-US-Neural2-A",
            "en-US-Neural2-C": "FEMALE en-US-Neural2-C",
            "en-US-Neural2-D": "MALE en-US-Neural2-D",
            "en-US-Neural2-E": "FEMALE en-US-Neural2-E",
            "en-US-Neural2-F": "FEMALE en-US-Neural2-F",
            "en-US-Neural2-G": "FEMALE en-US-Neural2-G",
            "en-US-Neural2-H": "FEMALE en-US-Neural2-H",
            "en-US-Neural2-I": "MALE en-US-Neural2-I",
            "en-US-Neural2-J": "MALE en-US-Neural2-J",
            "en-US-News-K": "FEMALE en-US-News-K",
            "en-US-News-L": "FEMALE en-US-News-L",
            "en-US-News-N": "MALE en-US-News-N",
            "en-US-Polyglot-1": "MALE en-US-Polyglot-1",
            "en-US-Standard-A": "MALE en-US-Standard-A",
            "en-US-Standard-B": "MALE en-US-Standard-B",
            "en-US-Standard-C": "FEMALE en-US-Standard-C",
            "en-US-Standard-D": "MALE en-US-Standard-D",
            "en-US-Standard-E": "FEMALE en-US-Standard-E",
            "en-US-Standard-F": "FEMALE en-US-Standard-F",
            "en-US-Standard-G": "FEMALE en-US-Standard-G",
            "en-US-Standard-H": "FEMALE en-US-Standard-H",
            "en-US-Standard-I": "MALE en-US-Standard-I",
            "en-US-Standard-J": "MALE en-US-Standard-J",
            "en-US-Studio-O": "FEMALE en-US-Studio-O",
            "en-US-Studio-Q": "MALE en-US-Studio-Q",
            "en-US-Wavenet-A": "MALE en-US-Wavenet-A",
            "en-US-Wavenet-B": "MALE en-US-Wavenet-B",
            "en-US-Wavenet-C": "FEMALE en-US-Wavenet-C",
            "en-US-Wavenet-D": "MALE en-US-Wavenet-D",
            "en-US-Wavenet-E": "FEMALE en-US-Wavenet-E",
            "en-US-Wavenet-F": "FEMALE en-US-Wavenet-F",
            "en-US-Wavenet-G": "FEMALE en-US-Wavenet-G",
            "en-US-Wavenet-H": "FEMALE en-US-Wavenet-H",
            "en-US-Wavenet-I": "MALE en-US-Wavenet-I",
            "en-US-Wavenet-J": "MALE en-US-Wavenet-J"
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