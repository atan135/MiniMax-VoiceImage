音乐生成
歌词生成 (Lyrics Generation)

复制页面

使用本接口生成歌词，支持完整歌曲创作和歌词编辑/续写。

POST
/
v1
/
lyrics_generation

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
mode
enum<string>必填
生成模式。
write_full_song：写完整歌曲
edit：编辑/续写歌词

可用选项: write_full_song, edit 
​
prompt
string
提示词/指令，用于描述歌曲主题、风格或编辑方向。为空时随机生成。

Maximum string length: 2000
​
lyrics
string
现有歌词内容，仅在 edit 模式下有效。可用于续写或修改已有歌词。

Maximum string length: 3500
​
title
string
歌曲标题。传入后输出将保持该标题不变。

响应
200 - application/json
成功响应

​
song_title
string
生成的歌名。若请求传入 title 则保持一致。

​
style_tags
string
风格标签，逗号分隔。例如：Pop, Upbeat, Female Vocals

​
lyrics
string
生成的歌词，包含结构标签。可直接用于音乐生成接口的 lyrics 参数生成歌曲。
支持的结构标签（14种）：[Intro], [Verse], [Pre-Chorus], [Chorus], [Hook], [Drop], [Bridge], [Solo], [Build-up], [Instrumental], [Breakdown], [Break], [Interlude], [Outro]

​
base_resp
object
状态码及详情

Hide child attributes

​
base_resp.status_code
integer
状态码及其分别含义如下：

0: 请求成功

1002: 触发限流，请稍后再试

1004: 账号鉴权失败，请检查 API-Key 是否填写正确

1008: 账号余额不足

1026: 输入包含敏感内容

2013: 传入参数异常，请检查入参是否按要求填写

2049: 无效的api key

更多内容可查看 错误码查询列表 了解详情

​
base_resp.status_msg
string
具体错误详情

Hide child attributes

​
base_resp.status_code
integer
状态码及其分别含义如下：

0: 请求成功

1002: 触发限流，请稍后再试

1004: 账号鉴权失败，请检查 API-Key 是否填写正确

1008: 账号余额不足

1026: 输入包含敏感内容

2013: 传入参数异常，请检查入参是否按要求填写

2049: 无效的api key

更多内容可查看 错误码查询列表 了解详情

​
base_resp.status_msg
string
具体错误详情


音乐生成
音乐生成 (Music Generation)

复制页面

使用本接口，输入歌词和歌曲描述，进行歌曲生成。

POST
/
v1
/
music_generation

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
model
enum<string>必填
使用的模型名称，可选 music-2.6（推荐）、music-2.5+ 或 music-2.5

可用选项: music-2.6, music-2.5+, music-2.5 
​
prompt
string
音乐的描述，用于指定风格、情绪和场景。例如"流行音乐, 难过, 适合在下雨的晚上"。
注意：

music-2.6 / music-2.5+ 纯音乐（is_instrumental: true）：必填，长度限制 [1, 2000] 个字符
music-2.6 / music-2.5+ / music-2.5（非纯音乐）：可选，长度限制 [0, 2000] 个字符
Maximum string length: 2000
​
lyrics
string
歌曲歌词，使用 \n 分隔每行。支持结构标签：[Intro], [Verse], [Pre Chorus], [Chorus], [Interlude], [Bridge], [Outro], [Post Chorus], [Transition], [Break], [Hook], [Build Up], [Inst], [Solo]。


注意：

music-2.6 / music-2.5+ 纯音乐（is_instrumental: true）：非必填
music-2.6 / music-2.5+ / music-2.5（非纯音乐）：必填，长度限制 [1, 3500] 个字符
当 lyrics_optimizer: true 且 lyrics 为空时，系统将根据 prompt 自动生成歌词
Required string length: 1 - 3500
​
stream
boolean默认值:false
是否使用流式传输，默认为 false

​
output_format
enum<string>默认值:hex
音频的返回格式，可选值为 url 或 hex，默认为 hex。当 stream 为 true 时，仅支持 hex 格式。注意：url 的有效期为 24 小时，请及时下载

可用选项: url, hex 
​
audio_setting
object
音频输出配置

Show child attributes

​
aigc_watermark
boolean
是否在音频末尾添加水印，默认为 false。仅在非流式 (stream: false) 请求时生效

​
lyrics_optimizer
boolean默认值:false
是否根据 prompt 描述自动生成歌词。仅 music-2.6、music-2.5+ 和 music-2.5 支持。

设为 true 且 lyrics 为空时，系统会根据 prompt 自动生成歌词。默认为 false

​
is_instrumental
boolean默认值:false
是否生成纯音乐（无人声）。仅 music-2.6 和 music-2.5+ 支持。

设为 true 时，lyrics 字段非必填。默认为 false
响应
200 - application/json
​
data
object
Show child attributes

​
base_resp
object
状态码及详情

Hide child attributes

​
base_resp.status_code
integer
状态码及其分别含义如下：

0: 请求成功

1002: 触发限流，请稍后再试

1004: 账号鉴权失败，请检查 API-Key 是否填写正确

1008: 账号余额不足

1026: 图片描述涉及敏感内容

2013: 传入参数异常，请检查入参是否按要求填写

2049: 无效的api key

更多内容可查看 错误码查询列表 了解详情

​
base_resp.status_msg
string
具体错误详情