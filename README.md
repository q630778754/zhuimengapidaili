# zhuimengapidaili — 追梦 API 代理（Deno Deploy）

单一职责：**部署到 Deno Deploy**，作为 Cloudflare Worker → Agnes AI 的独立出口代理。

## 文件

| 文件 | 用途 |
|---|---|
| `main.ts` | Deno Deploy 入口文件（Deno 默认找这个名字） |
| `README.md` | 本文件 |

## 部署步骤

### 1. 在 Deno Deploy 控制台新建项目

- 地址：https://dash.deno.com/account/projects
- 点 **Create project** → 选 **GitHub**
- 关联仓库：`q630778754/zhuimengapidaili`
- Branch: `main`

### 2. 配置 Build Configuration

| 字段 | 值 |
|---|---|
| **App Directory** | （留空，使用仓库根目录） |
| **Framework preset** | No Preset |
| **Install command** | （留空） |
| **Build command** | `deno check main.ts` |

### 3. 配置 Runtime Configuration

| 字段 | 值 |
|---|---|
| **Entrypoint** | `main.ts` |
| **Runtime Working Directory** | （留空） |
| **Runtime Memory Limit** | 768MiB（默认） |

### 4. 点 Deploy

拿到部署 URL，形如：
```
https://deno-api-proxy-nx3jyg8mdnj9.q630778754.deno.net
```

### 5. 验证代理工作

```bash
# 访问根路径，应返回 "Proxy is Running!"
curl https://<你的deno-url>/

# 测试 query string 保留（Agnes 视频轮询场景）
curl "https://<你的deno-url>/apihub.agnes-ai.com/agnesapi?video_id=test123&model_name=agnes-video-2.5-flash" \
  -H "Authorization: Bearer <你的agnes-api-key>"

# 预期：返回 401/403 或 "video not found"
# 如果返回 400 "video_id is required" —— 说明 query 丢了，代码没部署成功
```

## 代码改动说明

### 修复 tech-shrimp/deno-api-proxy 的 query string 丢失 bug

原始代码：
```ts
const targetUrl = `https://${pathname}`;  // ❌ 丢弃了 url.search
```

Agnes 视频轮询接口 `GET /agnesapi?video_id=xxx&model_name=xxx` 依赖 query 参数，丢了 query 会导致 Agnes 返回 `400: video_id is required`。

修复后：
```ts
const targetUrl = `https://${pathname}${url.search}`;  // ✅ 保留 query
```

## 用法

这个代理是纯转发，URL 格式：
```
https://<deno-url>/<上游host>/<上游path>?<query>
```

Cloudflare Worker 里配置：
```
AGNES_PROXY_BASE_URL = https://<deno-url>/apihub.agnes-ai.com
```

Worker 发出的请求 `POST /v1/chat/completions` 会被代理转发到 `https://apihub.agnes-ai.com/v1/chat/completions`。

## 故障排查

| 现象 | 原因 | 解决 |
|---|---|---|
| Deno 构建失败 `exit code 1` | Build command 为空或找不到 main.ts | 确认 App Directory 留空、Build command 填 `deno check main.ts` |
| 部署成功但访问 404 | 运行时 Entrypoint 没配 | Runtime Configuration → Entrypoint 填 `main.ts` |
| Agnes 返回 `400: video_id is required` | query string 丢失 | 确认部署的是本仓库的 `main.ts`（不是旧版 tech-shrimp） |
| 请求超时 | Deno 免费层并发限制 | 付费 Pro 或减少并发请求 |

## 相关资源

- Deno Deploy 文档：https://docs.deno.com/deploy/
- tech-shrimp 原项目：https://github.com/tech-shrimp/deno-api-proxy
- Agnes API 文档：https://docs.agnes-ai.com/
