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
        throw "Websocket失败: " + t
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
            throw "Websocket关闭: " + code + reason
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


// 全部voice数据
let voices = {}
// 当前语言下的voice
let currentVoices = new Map()

let EditorJS = {
    //音频的采样率 编辑TTS界面保存时调用
    "getAudioSampleRate": function (locale, voice) {
        // 根据voice判断返回的采样率
        // 也可以动态获取：
        return sampleRate
    },

    "getLocales": function () {
        return ["zh-CN"]
    },

    // 当语言变更时调用
    "getVoices": function (locale) {
        return {"xiaoyan": "讯飞小燕",
            "aisjiuxu": "讯飞许久",
            "aisxping": "讯飞小萍",
            "aisjinger": "讯飞小婧",
            "aisbabyxu": "讯飞许小宝",
            "ais111": "以下为特色发音人 4.28到期",
            "x4_lingfeizhe_zl": "聆飞哲",
            "x4_lingxiaoyao_comic":"聆小瑶-幽默",
            "x4_lingxiaoyao_em": '聆小瑶-情感',
            "x4_lingxiaoyao_en": '聆小瑶-助理',
            "x3_yifei": "讯飞一菲",
            "x_laoma": "讯飞马叔",
            "x_yuanye": "讯飞易阳泽(原野)",
            "x2_xiaowan": "讯飞小婉",
            "x3_guanshan": "讯飞关山",
            "x3_guanshan_talk": "讯飞关山-对话",
            "x3_qianxue": "讯飞千雪",
            "x_dahuilang": "讯飞大灰狼",
       }
    },

    "onLoadData": function () {},

    "onLoadUI": function (ctx, linerLayout) {
        let cb = new CheckBox(ctx)
        cb.setText("背景音乐（仅特色发音人支持）")
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


