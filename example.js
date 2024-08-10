let hostUrl = "wss://tts-api.xfyun.cn/v2/tts"
let appId = ttsrv.userVars["appId"]
let apiKey = ttsrv.userVars["apiKey"]
let apiSecret = ttsrv.userVars["apiSecret"]

let sampleRate = 16000

let PluginJS = {
    "name": "讯飞付费",
    "id": "cn.xfyun.tts",
    "author": "TTS Server",
    "description": "",
    "version": 1,

    "vars":{
        appId:{label:"AppID"},
        apiKey: {label:"ApiKey"},
        apiSecret: {label: "ApiSecret"}
    },

    "getAudio": function (text, locale, voice, rate, volume, pitch) {
        return getAudio(text, voice, rate, volume, pitch)
    },
}

function sha256(signString, apiSecret) {
    let aly = new JavaImporter(
        javax.crypto.Mac,
        javax.crypto.spec.SecretKeySpec,
    );
    with (aly) {
        let secretKeySpec = new SecretKeySpec(ttsrv.strToBytes(apiSecret), "HmacSHA256");
        var mac = Mac.getInstance('HmacSHA256');
        mac.init(secretKeySpec)
        var signData = mac.doFinal(ttsrv.strToBytes(new java.lang.String(signString)));
        return signData
    }
}

function getReqUrl(hostUrl, apiKey, apiSecret) {
    let uri = new java.net.URI(hostUrl)
    let host = uri.getHost()
    let path = uri.getPath()

    const date = new Date().toUTCString()
    const signString = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    let sha = ttsrv.base64Encode(sha256(signString, apiSecret))
    const authUrl = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${sha}"`;
    const authorization = ttsrv.base64Encode(authUrl);

    const params = [];
    params.push('authorization=' + encodeURIComponent(authorization));
    params.push('date=' + encodeURIComponent(date));
    params.push('host=' + encodeURIComponent(host));
    const queryString = params.join('&');

    return `${hostUrl}?${queryString}`
}


let ws = null
let wsUuid = ""

function checkWebSocket() {
    logger.i("init Websocket")

    url = getReqUrl(hostUrl, apiKey, apiSecret)
    ws = JWebSocket(new java.lang.String(url), {})
    ws.onThrowable = function (t) {
        logger.e("onThrowable: " + t)
    }
}

function getAudio(text, voice, rate, volume, pitch) {
    if (voice === null || voice === "") {
        voice = "xiaoyan"
    }

    checkWebSocket()
    let pos = new java.io.PipedOutputStream()

    ws.onOpen = function (response) {
        logger.i("onOpen: " + response)
        sendMessage()
    }

    ws.onFailure = function (t) {
        logger.e("onFailure: " + t)
        pos.close()
        throw "WebSocket failure: " + t
    }

    ws.onTextMessage = function (str) {
        let result = JSON.parse(str)
        if (result.code === 0) {
            if (result.data.audio != null){
                let audio = ttsrv.base64DecodeToBytes(result.data.audio)

                pos.write(audio)
            }

            if (result.data.status === 2){
                pos.close()
                ws.close(1000)
            }
        }
    }

    ws.onClosing = function (code, reason) {
        logger.e("onClosing: " + code + reason)
        if (code != 1000){
            throw "WebSocket closed: " + code + reason
        }
    }

    ws.onClosed = function (code, reason) {
        logger.e("onClosed: " + code + reason)
        pos.close()
    }

    if (ws.state === JWebSocket.OPEN) {
        sendMessage()
    } else {
        logger.d("connect...")
        ws.connect()
    }

    function sendMessage() {
        logger.i("sendMessage....")

        let isRaw = ttsrv.tts.data["raw"] == "true"
      let reqBody = {
        "common": {
          "app_id": appId
        },
        "business": {
          "aue": "lame",
          "sfl": 1,
          "vcn": voice,
          "volume": volume,
          "pitch": pitch,
          "speed": rate,
          "bgs": ttsrv.tts.data["bgm"] == "true" ? 1 : 0,
          "tte": "UTF8",
        },
        "data": {
          "status": 2,
          "text": ttsrv.base64Encode(text),
        }
      }

        let reqStrMsg = JSON.stringify(reqBody)
        ws.send(reqStrMsg)
    }

    return new java.io.PipedInputStream(pos)
}


// All voice data
let voices = {}
// Voices for the current language
let currentVoices = new Map()

let EditorJS = {
    // Audio sample rate, called when saving the TTS interface
    "getAudioSampleRate": function (locale, voice) {
        // Determine the sample rate based on the voice
        // Can also be dynamically obtained:
        return sampleRate
    },

    "getLocales": function () {
        return ["zh-CN"]
    },

    // Called when the language changes
    "getVoices": function (locale) {
        return {"xiaoyan": "iFLYTEK Xiaoyan",
            "aisjiuxu": "iFLYTEK Xiujiu",
            "aisxping": "iFLYTEK Xiaoping",
            "aisjinger": "iFLYTEK Xiaojing",
            "aisbabyxu": "iFLYTEK Xuxiaobao",
            "ais111": "The following are special voices (expires on 4.28)",
            "x4_lingfeizhe_zl": "Lingfeizhe",
            "x4_lingxiaoyao_comic":"Lingxiaoyao-Humor",
            "x4_lingxiaoyao_em": 'Lingxiaoyao-Emotion',
            "x4_lingxiaoyao_en": 'Lingxiaoyao-Assistant',
            "x3_yifei": "iFLYTEK Yifei",
            "x_laoma": "iFLYTEK Uncle Ma",
            "x_yuanye": "iFLYTEK Yi Yangze (Yuanye)",
            "x2_xiaowan": "iFLYTEK Xiaowan",
            "x3_guanshan": "iFLYTEK Guanshan",
            "x3_guanshan_talk": "iFLYTEK Guanshan-Dialogue",
            "x3_qianxue": "iFLYTEK Qianxue",
            "x_dahuilang": "iFLYTEK Big Bad Wolf",
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