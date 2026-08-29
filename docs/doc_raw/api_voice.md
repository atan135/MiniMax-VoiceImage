text
string必填
需要合成语音的文本，长度限制小于 10000 字符，若文本长度大于 3000 字符，推荐使用流式输出

段落切换用换行符标记
停顿控制：支持自定义文本之间的语音时间间隔，以实现自定义文本语音停顿时间的效果。使用方式：在文本中增加<#x#>标记，x 为停顿时长（单位：秒），范围 [0.01, 99.99]，最多保留两位小数。文本间隔时间需设置在两个可以语音发音的文本之间，不可连续使用多个停顿标记
语气词标签：仅当模型选择 speech-2.8-hd 或 speech-2.8-turbo 时，支持在文本中插入语气词标签。支持的语气词：(laughs)（笑声）、(chuckle)（轻笑）、(coughs)（咳嗽）、(clear-throat)（清嗓子）、(groans)（呻吟）、(breath)（正常换气）、(pant)（喘气）、(inhale)（吸气）、(exhale)（呼气）、(gasps)（倒吸气）、(sniffs)（吸鼻子）、(sighs)（叹气）、(snorts)（喷鼻息）、(burps)（打嗝）、(lip-smacking)（咂嘴）、(humming)（哼唱）、(hissing)（嘶嘶声）、(emm)（嗯）、(sneezes)（喷嚏）
​
stream
boolean
控制是否流式输出。默认 false，即不开启流式

​
stream_options
object
Show child attributes

​
voice_setting
object
Hide child attributes

​
voice_setting.voice_id
string必填
合成音频的音色编号。若需要设置混合音色，请设置 timbre_weights 参数，本参数设置为空值。支持系统音色、复刻音色以及文生音色三种类型，以下是部分最新的系统音色（ID），可查看 系统音色列表 或使用 查询可用音色 API 查询系统支持的全部音色

中文:
moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85
moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d
Chinese (Mandarin)\_Lyrical_Voice
Chinese (Mandarin)\_HK_Flight_Attendant
英文:
English_Graceful_Lady
English_Insightful_Speaker
English_radiant_girl
English_Persuasive_Man
moss_audio_6dc281eb-713c-11f0-a447-9613c873494c
moss_audio_570551b1-735c-11f0-b236-0adeeecad052
moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8
English_Lucky_Robot
日文:
Japanese_Whisper_Belle
moss_audio_24875c4a-7be4-11f0-9359-4e72c55db738
moss_audio_7f4ee608-78ea-11f0-bb73-1e2a4cfcd245
moss_audio_c1a6a3ac-7be6-11f0-8e8e-36b92fbb4f95
​
voice_setting.speed
number<float>默认值:1
合成音频的语速，取值越大，语速越快。取值范围 [0.5,2]，默认值为1.0

必填范围: 0.5 <= x <= 2
​
voice_setting.vol
number<float>默认值:1
合成音频的音量，取值越大，音量越高。取值范围 (0,10]，默认值为 1.0

必填范围: x <= 10
​
voice_setting.pitch
integer默认值:0
合成音频的语调，取值范围 [-12,12]，默认值为 0，其中 0 为原音色输出

必填范围: -12 <= x <= 12
​
voice_setting.emotion
enum<string>
控制合成语音的情绪，参数范围 ["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm", "fluent", "whisper"]，分别对应 8 种情绪：高兴，悲伤，愤怒，害怕，厌恶，惊讶，中性，生动，低语

模型会根据输入文本自动匹配合适的情绪，一般无需手动指定
该参数仅对 speech-2.8-hd, speech-2.8-turbo, speech-2.6-hd, speech-2.6-turbo, speech-02-hd, speech-02-turbo, speech-01-hd, speech-01-turbo 模型生效
选项 fluent, whisper 仅对 speech-2.6-turbo, speech-2.6-hd 模型生效，speech-2.8-hd, speech-2.8-turbo 模型不支持 whisper
可用选项: happy, sad, angry, fearful, disgusted, surprised, calm, fluent, whisper
​
voice_setting.text_normalization
boolean默认值:false
是否启用中文、英语文本规范化，开启后可提升数字阅读场景的性能，但会略微增加延迟，默认值为 false

​
voice_setting.latex_read
boolean默认值:false
控制是否朗读 latex 公式，默认为 false
需注意:

仅支持中文，开启该参数后，language_boost 参数会被设置为 Chinese
请求中的公式需要在公式的首尾加上 $$
请求中公式若有 "\"，需转义成 "\\".
示例：一元二次方程根的基本公式
The quadratic formula

应表示为 $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

​
audio_setting
object
Show child attributes

​
pronunciation_dict
object
Show child attributes

​
timbre_weights
object[]
Show child attributes

​
language_boost
enum<string>
是否增强对指定的小语种和方言的识别能力。默认值为 null，可设置为 auto 让模型自主判断。

注意：speech-01 和 speech-02 系列模型暂不支持 Persian、Filipino、Tamil 这三个语种。

可用选项: Chinese, Chinese,Yue, English, Arabic, Russian, Spanish, French, Portuguese, German, Turkish, Dutch, Ukrainian, Vietnamese, Indonesian, Japanese, Italian, Korean, Thai, Polish, Romanian, Greek, Czech, Finnish, Hindi, Bulgarian, Danish, Hebrew, Malay, Persian, Slovak, Swedish, Croatian, Filipino, Hungarian, Norwegian, Slovenian, Catalan, Nynorsk, Tamil, Afrikaans, auto
​
voice_modify
object
声音效果器设置，该参数支持的音频格式：

非流式：mp3, wav, flac
流式：mp3
Show child attributes

​
subtitle_enable
boolean默认值:false
控制是否开启字幕服务，默认值为 false。仅对 speech-2.8-hd, speech-2.8-turbo, speech-2.6-hd, speech-2.6-turbo, speech-02-hd, speech-02-turbo, speech-01-hd, speech-01-turbo 模型有效

​
output_format
enum<string>默认值:hex
控制输出结果形式的参数，可选值范围为[url, hex]，默认值为 hex 。该参数仅在非流式场景生效，流式场景仅支持返回 hex 形式。返回的 url 有效期为 24 小时

可用选项: url, hex
​
aigc_watermark
boolean默认值:false
控制在合成音频的末尾添加音频节奏标识，默认值为 False。该参数仅对非流式合成生效
