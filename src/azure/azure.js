let apiKey = ttsrv.userVars["apiKey"]
let manualLangSpeed = ttsrv.userVars["manualLangSpeed"]
let region = ttsrv.userVars["region"]
let defaultVoice = "en-US-AvaNeural"
let jpDefaultVoice = "ja-JP-NanamiNeural"
let jpDefaultMaleVoice = "ja-JP-DaichiNeural"

let PluginJS = {
    "name": "AzureTts",
    "pluginId": "mk.azure.tts",
    "author": "mkXultra",
    "description": "Azure Text-to-Speech API",
    "version": 1,

    "vars": {
        apiKey: {label: "API-KEY", hint: "Azure API-KEY"},
        manualLangSpeed: {label: "Manual Language Speed", hint: "Manual Language Speed"},
        region: {label: "Region", hint: "Region"},
    },

    "getAudio": function (text, locale, voice, rate, volume, pitch) {
        return getAudio(text, voice, rate, volume, pitch)
    },
}


function getGender(voiceCode) {
    let voices = EditorJS.getVoices("en-US");
    return voices[voiceCode] && voices[voiceCode].startsWith("MALE") ? "MALE" : "FEMALE";
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
    logger.i("getAudio")
    logger.i("rate: " + rate)
    let speed = rate
    if (voice === null || voice === "") {
        voice = defaultVoice
    }
    if (rate === null || rate === "" || rate === 0) {
        speed = 1
    } else{
        // kindle reader speed is 1 = 20%
        speed = (parseFloat(rate) / 20)
        // Ensure rate is within the valid range
        speed = Math.max(0.25, Math.min(1.5, parseFloat(speed)))
    }
    logger.i("speed: " + speed)
    if(manualLangSpeed < 3){
        jpSpeed = manualLangSpeed
    }

    let xmlBody;
    let reqHeaders = {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'ogg-24khz-16bit-mono-opus',
        'User-Agent': 'tts-server-plugin-mk-azure'
    };

    if (isEnglish(text)) {
        let prosodyRate;
        if (speed >= 1.1) {
            prosodyRate = `+${((speed - 1) * 100).toFixed(0)}%`;
        } else if (speed <= 0.9) {
            prosodyRate = `-${((1 - speed) * 100).toFixed(0)}%`;
        } else {
            prosodyRate = `${speed}`;
        }
        let prosodyTag = speed !== 1 ? `<prosody rate="${prosodyRate}">${text}</prosody>` : text;
        xmlBody = `
        <speak version='1.0' xml:lang='en-US'>
            <voice xml:lang='en-US' xml:gender='${getGender(voice)}' name='${voice}'>
                ${prosodyTag}
            </voice>
        </speak>`;
    }else{
        let prosodyRate;
        if (jpSpeed >= 1.1) {
            prosodyRate = `+${((jpSpeed - 1) * 100).toFixed(0)}%`;
        } else if (jpSpeed <= 0.9) {
            prosodyRate = `-${((1 - jpSpeed) * 100).toFixed(0)}%`;
        } else {
            prosodyRate = `${jpSpeed}`;
        }
        let prosodyTag = jpSpeed !== 1 ? `<prosody rate="${prosodyRate}">${text}</prosody>` : text;

        const gender = getGender(voice);
        let jpFEMALEVoice = "ja-JP-MayuNeural"
        if (voice == defaultVoice){
            jpFEMALEVoice = jpDefaultVoice
        }
        let jpVoice = gender == "FEMALE" ? jpFEMALEVoice : jpDefaultMaleVoice

        xmlBody = `
        <speak version='1.0' xml:lang='ja-JP'>
            <voice xml:lang='ja-JP' xml:gender='${getGender(voice)}' name='${jpVoice}'>
                ${prosodyTag}
            </voice>
        </speak>`;
    }

    let resp = ttsrv.httpPost(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, xmlBody, reqHeaders)
    if (resp.isSuccessful()) {
        return resp.body().byteStream()
    } else {
        throw "FAILED: status=" + resp.code() + " body=" + resp.body().string() + " params=" + "text=" + text + " voice=" + voice + " rate=" + rate + " volume=" + volume + " pitch=" + pitch
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

            // "en-US-AndrewMultilingualNeural4": "MALE en-US-AndrewMultilingualNeural4",
            // "en-US-EmmaMultilingualNeural4": "FEMALE en-US-EmmaMultilingualNeural4",
            // "en-US-BrianMultilingualNeural4": "MALE en-US-BrianMultilingualNeural4",

            // default
            defaultVoice: `FEMALE ${defaultVoice}`,
            "en-US-AndrewNeural": "MALE en-US-AndrewNeural",
            "en-US-EmmaNeural": "FEMALE en-US-EmmaNeural",
            "en-US-BrianNeural": "MALE en-US-BrianNeural",
            "en-US-JennyNeural": "FEMALE en-US-JennyNeural",
            "en-US-GuyNeural": "MALE en-US-GuyNeural",
            "en-US-AriaNeural": "FEMALE en-US-AriaNeural",
            "en-US-DavisNeural": "MALE en-US-DavisNeural",
            "en-US-JaneNeural": "FEMALE en-US-JaneNeural",
            "en-US-JasonNeural": "MALE en-US-JasonNeural",
            "en-US-SaraNeural": "FEMALE en-US-SaraNeural",
            "en-US-TonyNeural": "MALE en-US-TonyNeural",
            "en-US-NancyNeural": "FEMALE en-US-NancyNeural",
            "en-US-AmberNeural": "FEMALE en-US-AmberNeural",
            "en-US-AnaNeural": "FEMALE en-US-AnaNeural",
            "en-US-AshleyNeural": "FEMALE en-US-AshleyNeural",
            "en-US-BrandonNeural": "MALE en-US-BrandonNeural",
            "en-US-ChristopherNeural": "MALE en-US-ChristopherNeural",
            "en-US-CoraNeural": "FEMALE en-US-CoraNeural",
            "en-US-ElizabethNeural": "FEMALE en-US-ElizabethNeural",
            "en-US-EricNeural": "MALE en-US-EricNeural",
            "en-US-JacobNeural": "MALE en-US-JacobNeural",
            "en-US-JennyMultilingualNeural4": "FEMALE en-US-JennyMultilingualNeural4",
            "en-US-MichelleNeural": "FEMALE en-US-MichelleNeural",
            "en-US-MonicaNeural": "FEMALE en-US-MonicaNeural",
            "en-US-RogerNeural": "MALE en-US-RogerNeural",
            "en-US-RyanMultilingualNeural4": "MALE en-US-RyanMultilingualNeural4",
            "en-US-SteffanNeural": "MALE en-US-SteffanNeural",
            "en-US-AIGenerate1Neural1": "MALE en-US-AIGenerate1Neural1",
            "en-US-AIGenerate2Neural1": "FEMALE en-US-AIGenerate2Neural1",
            "en-US-AlloyTurboMultilingualNeural1": "MALE en-US-AlloyTurboMultilingualNeural1",
            "en-US-BlueNeural1": "NEUTRAL en-US-BlueNeural1",
            "en-US-KaiNeural1": "MALE en-US-KaiNeural1",
            "en-US-LunaNeural1": "FEMALE en-US-LunaNeural1",
            "en-US-NovaTurboMultilingualNeural1": "FEMALE en-US-NovaTurboMultilingualNeural1",
            "en-US-AlloyMultilingualNeural5": "MALE en-US-AlloyMultilingualNeural5",
            "en-US-EchoMultilingualNeural5": "MALE en-US-EchoMultilingualNeural5",
            "en-US-FableMultilingualNeural5": "NEUTRAL en-US-FableMultilingualNeural5",
            "en-US-OnyxMultilingualNeural5": "MALE en-US-OnyxMultilingualNeural5",
            "en-US-NovaMultilingualNeural5": "FEMALE en-US-NovaMultilingualNeural5",
            "en-US-ShimmerMultilingualNeural5": "FEMALE en-US-ShimmerMultilingualNeural5",
            "en-US-AlloyMultilingualNeuralHD5": "MALE en-US-AlloyMultilingualNeuralHD5",
            "en-US-EchoMultilingualNeuralHD5": "MALE en-US-EchoMultilingualNeuralHD5",
            "en-US-FableMultilingualNeuralHD5": "NEUTRAL en-US-FableMultilingualNeuralHD5",
            "en-US-OnyxMultilingualNeuralHD5": "MALE en-US-OnyxMultilingualNeuralHD5",
            "en-US-NovaMultilingualNeuralHD5": "FEMALE en-US-NovaMultilingualNeuralHD5",
            "en-US-ShimmerMultilingualNeuralHD5": "FEMALE en-US-ShimmerMultilingualNeuralHD5"
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

