# 部署指南

本文档适用于 Linux CentOS + Nginx + Node.js + MySQL 环境。

## 一、环境准备

### 1. 安装 Node.js 18+

```bash
# 使用 nvm 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

# 验证
node -v  # 应显示 v18.x.x
npm -v
```

### 2. 安装 MySQL 8.0

```bash
# CentOS 7
sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-7.noarch.rpm
sudo yum install -y mysql-community-server
sudo systemctl start mysqld
sudo systemctl enable mysqld

# CentOS 8
sudo dnf install https://dev.mysql.com/get/mysql80-community-release-el8-4.noarch.rpm
sudo dnf install mysql-community-server
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 获取临时密码
sudo grep 'temporary password' /var/log/mysqld.log

# 登录并修改密码
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'YourNewPassword';
CREATE DATABASE minimax CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 安装 Nginx

```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. 配置防火墙

```bash
# 开放端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# 或直接关闭防火墙（测试环境）
sudo systemctl stop firewalld
sudo systemctl disable firewalld
```

---

## 二、项目部署

### 1. 创建项目目录

```bash
sudo mkdir -p /var/www/minimax
sudo chown -R $USER:$USER /var/www/minimax
```

### 2. 上传项目文件

方式一：Git 拉取（推荐）
```bash
cd /var/www/minimax
git clone https://your-repo-url.git .
```

方式二：SCP 上传压缩包
```bash
# 本地执行
scp -r /path/to/project user@server:/var/www/minimax
```

### 3. 安装依赖

```bash
cd /var/www/minimax
npm run install:all
```

### 4. 构建前端

```bash
cd client
npm run build
```

构建完成后，前端文件会生成在 `client/dist` 目录。

---

## 三、环境配置

### 1. 创建生产环境配置文件

```bash
cd /var/www/minimax
vim .env
```

添加以下内容：

```env
# MiniMax API
API_KEY=your_api_key_here

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=minimax

# 服务端口
PORT=3000
```

### 2. 设置目录权限

```bash
chmod 755 /var/www/minimax
chmod 600 /var/www/minimax/.env
```

---

## 四、Nginx 配置

### 1. 创建 Nginx 配置文件

```bash
sudo vim /etc/nginx/conf.d/minimax.conf
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name your_domain.com;  # 替换为你的域名或IP

    # 前端静态文件
    root /var/www/minimax/client/dist;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源代理
    location /output/ {
        alias /var/www/minimax/output/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 日志
    access_log /var/log/nginx/minimax_access.log;
    error_log /var/log/nginx/minimax_error.log;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

### 2. 检查并重载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 五、进程管理（PM2）

### 1. 安装 PM2

```bash
npm install -g pm2
```

### 2. 启动后端服务

```bash
cd /var/www/minimax
pm2 start server/index.js --name minimax-api
```

### 3. 配置开机自启

```bash
pm2 startup
pm2 save
```

### 4. PM2 常用命令

```bash
pm2 list              # 查看进程列表
pm2 logs minimax-api   # 查看日志
pm2 restart minimax-api   # 重启
pm2 stop minimax-api       # 停止
pm2 delete minimax-api     # 删除
```

---

## 六、创建必要目录

```bash
cd /var/www/minimax
mkdir -p output/voice output/image output/uploads logs
chmod -R 777 output/ logs/
```

---

## 七、验证部署

### 1. 检查服务状态

```bash
# 检查 PM2
pm2 list

# 检查端口
netstat -tlnp | grep 3000
netstat -tlnp | grep 80
```

### 2. 测试访问

```bash
# 测试后端 API
curl http://127.0.0.1:3000/api/voice/options

# 测试前端（浏览器访问）
http://your_domain.com
```

---

## 八、SSL 证书配置（可选）

### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo yum install -y epel-release
sudo yum install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your_domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

配置完成后，将 Nginx 配置中的 `listen 80` 改为 `listen 443 ssl`。

---

## 九、目录结构

部署完成后的目录结构：

```
/var/www/minimax/
├── server/                 # 后端源码
│   └── index.js           # 启动入口
├── client/
│   └── dist/              # 前端构建产物（Nginx root 目录）
├── output/                 # 生成文件存储
│   ├── voice/
│   ├── image/
│   └── uploads/
├── logs/                   # 日志目录
├── .env                    # 环境变量
├── package.json
└── .gitignore
```

---

## 十、常见问题

### 1. 502 Bad Gateway

- 检查 PM2 进程是否运行：`pm2 list`
- 检查后端是否正常启动：`pm2 logs minimax-api`
- 检查 Nginx 代理配置是否正确

### 2. 数据库连接失败

- 检查 MySQL 服务：`systemctl status mysqld`
- 验证数据库配置：确保 `.env` 中 DB_* 配置正确
- 测试连接：`mysql -u root -p -e "SELECT 1"`

### 3. 前端静态资源 404

- 检查 Nginx root 路径配置：`root /var/www/minimax/client/dist;`
- 检查前端构建是否成功：`ls -la client/dist/`

### 4. 上传文件失败

- 检查 output 目录权限：`chmod -R 777 output/`
- 检查 Nginx 上传大小限制：添加 `client_max_body_size 100m;`
