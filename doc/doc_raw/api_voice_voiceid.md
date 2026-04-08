声音管理
查询可用音色ID

复制页面

使用本接口支持查询不同分类下的音色信息。

POST
/
v1
/
get_voice

试一试
该 API 支持查询当前账号下可调用的全部音色 ID（voice_id）。
包括系统音色、快速克隆音色、文生音色接口生成的音色、音乐生成接口的人声音色以及伴奏音色。
快速复刻得到的音色为未激活状态，需正式调用一次才可在本接口查询到
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
请求头
​
Content-Type
enum<string>默认值:application/json必填
请求体的媒介类型，请设置为 application/json，确保请求数据的格式为 JSON

可用选项: application/json 
请求体
application/json
​
voice_type
enum<string>必填
希望查询音色类型，支持以下取值：

system: 系统音色
voice_cloning: 快速复刻的音色，仅在成功用于语音合成后才可查询
voice_generation: 文生音色接口生成的音色，仅在成功用于语音合成后才可查询
all: 以上全部
可用选项: system, voice_cloning, voice_generation, all 
响应
200 - application/json
​
system_voice
object[]
包含系统预定义的音色。

Hide child attributes

​
system_voice.voice_id
string
音色 ID

​
system_voice.voice_name
string
音色名称，非调用的音色 ID

​
system_voice.description
string[]
音色描述

​
voice_cloning
object[]
包含音色快速复刻的音色数据

Hide child attributes

​
voice_cloning.voice_id
string
音色 ID

​
voice_cloning.description
string[]
生成音色时填写的音色描述

​
voice_cloning.created_time
string
创建时间，格式 yyyy-mm-dd

​
voice_generation
object[]
包含音色生成接口产生的音色数据

Hide child attributes

​
voice_generation.voice_id
string
音色 ID

​
voice_generation.description
string[]
生成音色时填写的音色描述

​
voice_generation.created_time
string
创建时间，格式 yyyy-mm-dd

​
base_resp
object
本次请求的状态码和详情

Hide child attributes

​
base_resp.status_code
integer<int64>
状态码。

0: 请求结果正常
2013: 输入参数信息不正常
更多内容可查看 错误码查询列表 了解详情

​
base_resp.status_msg
string
状态详情

声音管理
删除音色

复制页面

使用本接口，对于生成的部分音色进行删除。

POST
/
v1
/
delete_voice

试一试
该 API 用于删除指定 voice_id 的音色，删除范围为通过 Voice Cloning API 和 Voice Generation API 生成的音色的 voice_id。
⚠️ 注意：删除后，该 voice_id 将无法再次使用。
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
请求头
​
Content-Type
enum<string>默认值:application/json必填
请求体的媒介类型，请设置为 application/json，确保请求数据的格式为 JSON

可用选项: application/json 
请求体
application/json
​
voice_type
enum<string>必填
取值范围：voice_cloning（克隆的音色）/voice_generation（基于文本提示生成的音色），注意仅支持删除这两种类别的音色

可用选项: voice_cloning, voice_generation 
​
voice_id
string必填
希望删除音色的 voice_id

响应
200 - application/json
Successful response

​
voice_id
string
被删除声音的 voice_id

​
created_time
string
该音色生成请求提交的时间，非首次调用生效激活时间，格式为 yyyy-mm-dd

​
base_resp
object
状态码及状态详情

Hide child attributes

​
base_resp.status_code
integer<int64>
状态码

0: 删除成功
2013: 输入参数信息不正常
更多内容可查看 错误码查询列表 了解详情

​
base_resp.status_msg
string
状态详情





音色设计
音色设计

复制页面

使用本接口，输入文本内容，进行音色设计。

POST
/
v1
/
voice_design

试一试
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
请求头
​
Content-Type
enum<string>默认值:application/json必填
请求体的媒介类型，请设置为 application/json，确保请求数据的格式为 JSON

可用选项: application/json 
请求体
application/json
​
prompt
string必填
音色描述。

​
preview_text
string必填
试听音频文本。
注：试听音频的合成将收取 2 元/万字符的费用

Maximum string length: 500
​
voice_id
string
自定义生成音色的 voice_id。当不传入此参数时，将自动生成并返回一个唯一的 voice_id

​
aigc_watermark
boolean
是否在合成试听音频的末尾添加音频节奏标识，默认值为 False

响应
200 - application/json
​
voice_id
string
生成的音色 ID，可用于语音合成

​
trial_audio
string
使用生成的音色合成的试听音频，以 hex 编码形式返回

​
base_resp
object
状态码和状态详情

Hide child attributes

​
base_resp.status_code
integer<int64>
状态码。

0: 请求结果正常
1000: 未知错误
1001: 超时
1002: 触发 RPM 限流
1004: 鉴权失败
1008: 余额不足
1013: 服务内部错误
1027: 输出内容错误
1039: 触发 TPM 限流
2013: 输入格式信息不正常
更多内容可查看 错误码查询列表 了解详情

​
base_resp.status_msg
string
状态详情


上传复刻音频

复制页面

使用本接口上传用于复刻的音频文件。

POST
/
v1
/
files
/
upload

试一试
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
请求头
​
Content-Type
enum<string>默认值:multipart/form-datan必填
请求体的媒介类型 multipart/form-data

可用选项: multipart/form-data 
请求体
multipart/form-data
​
purpose
enum<string>默认值:voice_clone必填
文件使用目的。取值及支持格式如下：

voice_clone: 快速复刻原始文件，（支持mp3、m4a、wav格式）
可用选项: voice_clone 
示例:
"voice_clone"

​
file
file必填
需要上传的文件。填写文件的路径地址

支持上传的文件需遵从以下规范：

上传的音频文件格式需为：mp3、m4a、wav格式
上传的音频文件的时长最少应不低于10秒，最长应不超过5分钟
上传的音频文件大小需不超过20mb
响应
200 - application/json
​
file
object
Hide child attributes

​
file.file_id
integer<int64>
文件的唯一标识符

​
file.bytes
integer<int64>
文件大小，以字节为单位

​
file.created_at
integer<int64>
创建文件时的 Unix 时间戳，以秒为单位

​
file.filename
string
文件的名称

​
file.purpose
enum<string>
文件的使用目的

可用选项: voice_clone 
​
base_resp
object
Hide child attributes

​
base_resp.status_code
integer
状态码及其分别含义如下：

0，请求成功
1002，触发限流，请稍后再试
1004，账号鉴权失败，请检查 API-Key 是否填写正确
1008，账号余额不足
1026，图片描述涉及敏感内容
2013，传入参数异常，请检查入参是否按要求填写
2049，无效的api key
更多内容可查看错误码查询列表了解详情

​
base_resp.status_msg
string
状态详情
上传示例音频

复制页面

使用本接口上传示例音频文件，使用示例音频将有助于增强语音合成的音色相似度和稳定性。

POST
/
v1
/
files
/
upload

试一试
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
请求头
​
Content-Type
enum<string>默认值:multipart/form-datan必填
请求体的媒介类型 multipart/form-data

可用选项: multipart/form-data 
请求体
multipart/form-data
​
purpose
enum<string>默认值:prompt_audio必填
文件使用目的。取值及支持格式如下：

prompt_audio: 快速复刻原始文件，（支持mp3、m4a、wav格式）
可用选项: prompt_audio 
示例:
"prompt_audio"

​
file
file必填
需要上传的文件。填写文件的路径地址

支持上传的文件需遵从以下规范：

上传的音频文件格式需为：mp3、m4a、wav格式
上传的音频文件的时长小于8s
上传的音频文件大小需不超过20mb
响应
200 - application/json
​
file
object
Hide child attributes

​
file.file_id
integer<int64>
文件的唯一标识符

​
file.bytes
integer<int64>
文件大小，以字节为单位

​
file.created_at
integer<int64>
创建文件时的 Unix 时间戳，以秒为单位

​
file.filename
string
文件的名称

​
file.purpose
string默认值:["prompt_audio"]
文件的使用目的

​
base_resp
object
Hide child attributes

​
base_resp.status_code
integer
状态码及其分别含义如下：

0，请求成功
1002，触发限流，请稍后再试
1004，账号鉴权失败，请检查 API-Key 是否填写正确
1008，账号余额不足
1026，图片描述涉及敏感内容
2013，传入参数异常，请检查入参是否按要求填写
2049，无效的api key
更多内容可查看错误码查询列表了解详情

音色快速复刻

复制页面

使用本接口进行音色快速复刻。 复刻得到的音色若 7 天内未正式调用，则系统会删除该音色。

POST
/
v1
/
voice_clone

试一试
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
请求体
application/json
Voice clone request parameters

​
file_id
integer<int64>必填
待复刻音频的 file_id，通过文件上传接口获得
上传的待复刻音频文件需遵从以下规范：

上传的音频文件格式需为：mp3、m4a、wav 格式
上传的音频文件的时长最少应不低于 10 秒，最长应不超过 5 分钟
上传的音频文件大小需不超过 20 mb
若使用该参数，则两个子属性（prompt_audio、prompt_text）都为必填项
​
voice_id
string必填
克隆音色的 voice_id，正确示例："MiniMax001"。用户进行自定义 voice_id 时需注意：

自定义的 voice_id 长度范围[8,256]
首字符必须为英文字母
允许数字、字母、-、_
末位字符不可为 -、_
voice_id 不可与已有 id 重复，否则会报错
​
clone_prompt
object
音色复刻示例音频，提供本参数将有助于增强语音合成的音色相似度和稳定性。若使用本参数，需同时上传一小段示例音频
上传的音频文件需遵从以下规范：

上传的音频文件格式需为：mp3、m4a、wav 格式
上传的音频文件的时长小于 8 秒
上传的音频文件大小需不超过 20 mb
Show child attributes

​
text
string
复刻试听参数，限制 1000 字符以内。模型将使用复刻后的音色朗读本段文本内容，并返回试听音频链接。
注：试听将根据字符数正常收取语音合成费用，定价与 T2A 各接口一致

语气词标签：仅当模型选择 speech-2.8-hd 或 speech-2.8-turbo 时，支持在文本中插入语气词标签。支持的语气词：(laughs)（笑声）、(chuckle)（轻笑）、(coughs)（咳嗽）、(clear-throat)（清嗓子）、(groans)（呻吟）、(breath)（正常换气）、(pant)（喘气）、(inhale)（吸气）、(exhale)（呼气）、(gasps)（倒吸气）、(sniffs)（吸鼻子）、(sighs)（叹气）、(snorts)（喷鼻息）、(burps)（打嗝）、(lip-smacking)（咂嘴）、(humming)（哼唱）、(hissing)（嘶嘶声）、(emm)（嗯）、(whistles)（口哨）、(sneezes)（喷嚏）、(crying)（抽泣）、(applause)（鼓掌）
​
model
enum<string>
复刻试听参数。指定合成试听音频使用的语音模型，提供 text 字段时必传此字段。可选项：

可用选项: speech-2.8-hd, speech-2.8-turbo, speech-2.6-hd, speech-2.6-turbo, speech-02-hd, speech-02-turbo, speech-01-hd, speech-01-turbo 
​
language_boost
enum<string>
是否增强对指定的小语种和方言的识别能力。默认值为 null，可设置为 auto 让模型自主判断。

可用选项: Chinese, Chinese,Yue, English, Arabic, Russian, Spanish, French, Portuguese, German, Turkish, Dutch, Ukrainian, Vietnamese, Indonesian, Japanese, Italian, Korean, Thai, Polish, Romanian, Greek, Czech, Finnish, Hindi, Bulgarian, Danish, Hebrew, Malay, Persian, Slovak, Swedish, Croatian, Filipino, Hungarian, Norwegian, Slovenian, Catalan, Nynorsk, Tamil, Afrikaans, auto 
​
need_noise_reduction
boolean默认值:false
音频复刻参数，表示是否开启降噪，默认值为 false

​
need_volume_normalization
boolean默认值:false
音频复刻参数，是否开启音量归一化，默认值为 false

​
aigc_watermark
boolean默认值:false
是否在合成试听音频的末尾添加音频节奏标识，默认值为 false

响应
200 - application/json
Successful response

​
input_sensitive
object
输入音频是否命中风控

Show child attributes

​
demo_audio
string
如果请求体中传入了试听文本 text 以及合成试听音频的模型 model，那么本参数将以链接形式返回试听音频，否则本参数为空值

​
base_resp
object
Hide child attributes

​
base_resp.status_code
integer<int64>必填
状态码

0: 请求结果正常
1000：未知错误
1001：超时
1002：触发限流
1004：鉴权失败
1013：服务内部错误
2013：输入格式信息不正常
2038：无复刻权限，请检查账号认证状态
更多内容可查看错误码查询列表了解详情

​
base_resp.status_msg
string
状态详情

快速复刻功能实现具体操作流程如下：
上传待克隆音频 调用 上传复刻音频 上传待克隆的音频文件并获取 file_id。
支持上传的文件需遵从以下规范： 上传的音频文件格式需为：mp3、m4a、wav 格式； 上传的音频文件的时长最少应不低于 10 秒，最长应不超过 5 分钟； 上传的音频文件大小需不超过 20mb。
上传示例音频 (可选) 若需要提供示例音频以增强克隆效果，需要调用 上传示例音频上传示例音频文件并获得对应的 file_id。填写在clone_prompt中的prompt_audio中。
支持上传的文件需遵从以下规范： 上传的音频文件格式需为：mp3、m4a、wav 格式； 上传的音频文件的时长小于 8s； 上传的音频文件大小需不超过 20mb。
调用复刻接口 基于获取的 file_id 和自定义的 voice_id 作为输入参数，调用 快速复刻接口 克隆音色。
使用克隆音色 使用复刻生成的 voice_id，根据实际需求调用语音生成接口，例如：
同步语音合成
异步长文本语音合成