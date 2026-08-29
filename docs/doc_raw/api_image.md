图片生成
文生图

复制页面

使用本接口，输出文本内容，进行图片生成。

POST
/
v1
/
image_generation

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
请求体的媒介类型，请设置为 application/json 确保请求数据的格式为 JSON.

可用选项: application/json 
请求体
application/json
​
model
enum<string>必填
模型名称。可选值：image-01，image-01-live

可用选项: image-01, image-01-live 
​
prompt
string必填
图像的文本描述，最长 1500 字符

​
style
object
画风设置，仅当 model 为 image-01-live 时生效

Show child attributes

​
aspect_ratio
enum<string>
图像宽高比，默认为 1:1。可选值：

1:1 (1024x1024)
16:9 (1280x720)
4:3 (1152x864)
3:2 (1248x832)
2:3 (832x1248)
3:4 (864x1152)
9:16 (720x1280)
21:9 (1344x576) (仅适用于image-01)
可用选项: 1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9 
​
width
integer
生成图片的宽度（像素）。仅当 model 为 image-01 时生效。注意：width 和 height 需同时设置，取值范围[512, 2048]，且必须是 8 的倍数。若与 aspect_ratio 同时设置，则优先使用 aspect_ratio

​
height
integer
生成图片的高度（像素）。仅当 model 为 image-01 时生效。注意：width 和 height 需同时设置，取值范围[512, 2048]，且必须是 8 的倍数。若与 aspect_ratio 同时设置，则优先使用 aspect_ratio

​
response_format
enum<string>默认值:url
返回图片的形式，默认为 url。可选值：url, base64。
⚠️ 注意：url 的有效期为 24 小时

可用选项: url, base64 
​
seed
integer<int64>
随机种子。使用相同的 seed 和参数，可以生成内容相近的图片，用于复现结果。如未提供，算法会对 n 张图单独生成随机种子

​
n
integer默认值:1
单次请求生成的图片数量，取值范围[1, 9]，默认为 1

必填范围: 1 <= x <= 9
​
prompt_optimizer
boolean默认值:false
是否开启 prompt 自动优化，默认为 false.

​
aigc_watermark
boolean
是否在生成的图片中添加水印，默认为 false

响应
200 - application/json
​
data
object
Hide child attributes

​
data.image_urls
string[]
当 response_format 为 url 时返回，包含图片链接的数组

​
data.image_base64
string[]
当 response_format 为 base64 时返回，包含图片 Base64 编码的数组

​
metadata
object
因内容安全检查失败而未返回的图片数量

Hide child attributes

​
metadata.success_count
integer
N成功生成的图片数量

​
metadata.failed_count
integer
Number of images blocked due to content safety.

​
id
string
生成任务的 ID，用于后续查询任务状态

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
具体错误详情