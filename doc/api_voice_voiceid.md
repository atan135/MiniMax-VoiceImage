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