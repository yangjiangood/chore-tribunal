# 家庭无情裁判所 API 接口初稿

## 1. 文档目标

本文档定义第一阶段后端 API 草案，作为：

- NestJS Controller / Service 开发依据
- 前端 API Client 对接依据
- SSE 事件协议依据

说明：

- 默认前缀：`/api/v1`
- 返回格式以 JSON 为主
- 鉴权仅适用于云端模式

## 2. 通用约定

## 2.1 鉴权方式

建议采用：

- `accessToken`：短期
- `refreshToken`：长期

请求头：

```http
Authorization: Bearer <accessToken>
```

## 2.2 通用响应结构

### 成功响应

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### 失败响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数不合法",
    "details": {}
  }
}
```

## 2.3 通用错误码建议

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CONFLICT`
- `UNDO_WINDOW_EXPIRED`
- `EVENT_ALREADY_REVERTED`
- `RULE_DISABLED`
- `MEMBER_DISABLED`
- `AI_GENERATION_FAILED`

## 3. 模块总览

| 模块 | 路径前缀 |
| --- | --- |
| 鉴权 | `/auth` |
| 家庭 | `/families` |
| 成员 | `/members` |
| 规则 | `/task-rules` |
| 事件 | `/events` |
| 归档 | `/archives` |
| 判决 | `/verdicts` |
| 分析 | `/analytics` |
| 偏好 | `/preferences` |
| 实时 | `/realtime` |

## 4. Auth 模块

## 4.1 注册

`POST /api/v1/auth/register`

请求体：

```json
{
  "accountName": "tribunal-home",
  "password": "123456",
  "confirmPassword": "123456",
  "familyName": "周末裁判所",
  "timezone": "Asia/Shanghai"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "familyId": "uuid",
    "accountName": "tribunal-home"
  }
}
```

校验规则：

- `accountName` 非空
- `password` 6-20 位
- `confirmPassword` 必须一致

## 4.2 登录

`POST /api/v1/auth/login`

请求体：

```json
{
  "accountName": "tribunal-home",
  "password": "123456",
  "deviceLabel": "ipad-living-room"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt",
    "refreshToken": "token",
    "expiresIn": 3600,
    "family": {
      "id": "uuid",
      "name": "周末裁判所",
      "currentWeekId": "2026-W17"
    }
  }
}
```

## 4.3 刷新 Token

`POST /api/v1/auth/refresh`

请求体：

```json
{
  "refreshToken": "token"
}
```

## 4.4 登出

`POST /api/v1/auth/logout`

请求体：

```json
{
  "refreshToken": "token"
}
```

## 4.5 修改密码

已登录态下允许修改。

`POST /api/v1/auth/change-password`

请求体：

```json
{
  "currentPassword": "123456",
  "newPassword": "654321",
  "confirmPassword": "654321"
}
```

## 5. Family 模块

## 5.1 获取家庭初始化数据

首页登录后首个关键接口。

`GET /api/v1/families/me/bootstrap`

响应：

```json
{
  "success": true,
  "data": {
    "family": {
      "id": "uuid",
      "name": "周末裁判所",
      "timezone": "Asia/Shanghai",
      "currentWeekId": "2026-W17"
    },
    "members": [],
    "taskRules": [],
    "preferences": {},
    "currentBoardSnapshot": {
      "rankings": [],
      "recentLogs": [],
      "scoreSummary": {}
    }
  }
}
```

## 5.2 获取当前主屏快照

`GET /api/v1/families/me/board`

用于主屏重载和 SSE 断线恢复。

## 6. Member 模块

## 6.1 获取成员列表

`GET /api/v1/members`

查询参数：

- `status?=ACTIVE`

## 6.2 创建成员

`POST /api/v1/members`

请求体：

```json
{
  "nickname": "妈妈",
  "avatarType": "emoji",
  "avatarValue": "M",
  "cardColor": "gold-amber"
}
```

## 6.3 更新成员

`PATCH /api/v1/members/:memberId`

请求体：

```json
{
  "nickname": "妈妈大人",
  "cardColor": "ink-red"
}
```

## 6.4 停用成员

`POST /api/v1/members/:memberId/disable`

请求体：

```json
{
  "confirm": true
}
```

## 6.5 删除成员

仅允许无历史数据成员直接删除。

`DELETE /api/v1/members/:memberId`

## 7. TaskRule 模块

## 7.1 获取规则列表

`GET /api/v1/task-rules`

查询参数：

- `status?=ACTIVE`
- `taskType?=LIGHT`

## 7.2 创建规则

`POST /api/v1/task-rules`

请求体：

```json
{
  "taskType": "CORE",
  "label": "洗碗",
  "scoreDelta": 3,
  "sortOrder": 10,
  "isPinned": true
}
```

## 7.3 更新规则

`PATCH /api/v1/task-rules/:ruleId`

## 7.4 停用规则

`POST /api/v1/task-rules/:ruleId/disable`

## 7.5 重排规则

`POST /api/v1/task-rules/reorder`

请求体：

```json
{
  "items": [
    { "id": "uuid-1", "sortOrder": 10 },
    { "id": "uuid-2", "sortOrder": 20 }
  ]
}
```

## 8. Event 模块

## 8.1 创建打卡事件

这是首页最关键的写接口。

`POST /api/v1/events`

请求体：

```json
{
  "memberId": "uuid",
  "taskRuleId": "uuid",
  "clientEventId": "client-uuid",
  "timestamp": "2026-04-24T17:30:00.000Z"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "event": {
      "serverEventId": "uuid",
      "clientEventId": "client-uuid",
      "status": "PENDING",
      "undoToken": "undo-token",
      "undoExpiresAt": "2026-04-24T17:30:05.000Z"
    },
    "boardSnapshot": {
      "rankings": [],
      "recentLogs": [],
      "scoreSummary": {}
    }
  }
}
```

服务端职责：

- 校验成员状态
- 校验规则状态
- 写入事件快照
- 返回当前权威主屏快照

## 8.2 撤销打卡事件

`POST /api/v1/events/:eventId/revert`

请求体：

```json
{
  "undoToken": "undo-token"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "reverted": true,
    "eventStatus": "REVERTED",
    "boardSnapshot": {
      "rankings": [],
      "recentLogs": [],
      "scoreSummary": {}
    }
  }
}
```

错误场景：

- 窗口已过期
- 事件已撤销
- token 不匹配

## 8.3 获取打卡历史

`GET /api/v1/events`

查询参数：

- `dateFrom`
- `dateTo`
- `weekId`
- `memberId`
- `taskType`
- `taskLabel`
- `scoreMin`
- `scoreMax`
- `status`
- `page`
- `pageSize`

## 8.4 获取当前周排行

`GET /api/v1/events/rankings/current`

## 9. Archive 模块

## 9.1 创建周归档

`POST /api/v1/archives`

请求体：

```json
{
  "weekId": "2026-W17",
  "confirm": true
}
```

响应：

```json
{
  "success": true,
  "data": {
    "archiveId": "uuid",
    "weekId": "2026-W17",
    "summary": {}
  }
}
```

## 9.2 获取归档列表

`GET /api/v1/archives`

查询参数：

- `limit=12`

## 9.3 获取单周归档详情

`GET /api/v1/archives/:archiveId`

## 9.4 删除归档

高风险操作。

`DELETE /api/v1/archives/:archiveId`

## 10. Verdict 模块

## 10.1 生成 AI 判决

`POST /api/v1/verdicts/generate`

请求体：

```json
{
  "weekId": "2026-W17",
  "persona": "毒舌但暖心的家庭调解员",
  "styleProfile": {
    "toxicityLevel": 7,
    "allowAttack": true,
    "allowHumiliation": true,
    "allowLabeling": true
  }
}
```

响应：

```json
{
  "success": true,
  "data": {
    "verdictId": "uuid",
    "status": "SUCCESS",
    "source": "AI",
    "content": "本周家庭判决书正文...",
    "generatedAt": "2026-04-24T18:00:00.000Z"
  }
}
```

失败降级时：

```json
{
  "success": true,
  "data": {
    "verdictId": "uuid",
    "status": "FALLBACK",
    "source": "FALLBACK_TEMPLATE",
    "content": "本周网络法官堵车，先由值班书记员宣读简版判决..."
  }
}
```

## 10.2 获取最近一次判决

`GET /api/v1/verdicts/latest?weekId=2026-W17`

## 11. Analytics 模块

## 11.1 获取数据分析总览

`GET /api/v1/analytics/overview`

查询参数：

- `range=1w|4w|8w|12w`

响应：

```json
{
  "success": true,
  "data": {
    "overviewMetrics": {},
    "trendCharts": {},
    "fairnessCharts": {},
    "systemSummary": {
      "overall": "家庭活跃度稳定",
      "fairness": "当前分工轻度倾斜",
      "trend": "爸爸近两周有回升趋势"
    }
  }
}
```

## 12. Preferences 模块

## 12.1 获取偏好设置

`GET /api/v1/preferences`

## 12.2 更新偏好设置

`PATCH /api/v1/preferences`

请求体：

```json
{
  "defaultFullscreen": true,
  "soundEnabled": true,
  "motionEnabled": true,
  "fontScale": "lg",
  "themeStyle": "public-bulletin",
  "logSpeed": "normal",
  "cardDensity": "comfortable",
  "idleReminderEnabled": true,
  "verdictPersona": "无情开喷裁判长",
  "verdictToxicityLevel": 8,
  "allowAttack": true,
  "allowHumiliation": true,
  "allowLabeling": true
}
```

## 13. Realtime 模块

## 13.1 SSE 订阅

`GET /api/v1/realtime/board/stream`

请求头：

```http
Accept: text/event-stream
Authorization: Bearer <accessToken>
```

## 13.2 SSE 事件类型

建议推送以下事件：

### `board.snapshot`

全量主屏快照。

```json
{
  "type": "board.snapshot",
  "payload": {
    "rankings": [],
    "recentLogs": [],
    "scoreSummary": {}
  }
}
```

### `event.created`

```json
{
  "type": "event.created",
  "payload": {
    "eventId": "uuid",
    "memberId": "uuid",
    "status": "PENDING"
  }
}
```

### `event.reverted`

```json
{
  "type": "event.reverted",
  "payload": {
    "eventId": "uuid",
    "status": "REVERTED"
  }
}
```

### `archive.created`

### `verdict.generated`

## 14. 建议的 NestJS 模块映射

| Controller | Service |
| --- | --- |
| `AuthController` | `AuthService` |
| `FamiliesController` | `FamiliesService` |
| `MembersController` | `MembersService` |
| `TaskRulesController` | `TaskRulesService` |
| `EventsController` | `EventsService` |
| `ArchivesController` | `ArchivesService` |
| `VerdictsController` | `VerdictsService` |
| `AnalyticsController` | `AnalyticsService` |
| `PreferencesController` | `PreferencesService` |
| `RealtimeController` | `RealtimeService` |

## 15. 第一阶段可延后接口

以下接口可以在第一阶段后半段补上：

- `DELETE /archives/:archiveId`
- 头像上传接口
- 更细粒度的审计日志查询接口

但以下接口必须优先做：

- `auth/register`
- `auth/login`
- `families/me/bootstrap`
- `events`
- `events/:eventId/revert`
- `preferences`
- `verdicts/generate`
- `realtime/board/stream`

## 16. 最终结论

第一阶段 API 应以以下主链路为中心：

1. 极简注册 / 登录
2. 家庭初始化数据加载
3. 成员与规则配置
4. 打卡创建与撤销
5. 主屏 SSE 同步
6. 周归档与 AI 判决
7. 偏好与风格控制

如果下一步继续推进，建议直接基于本文件输出：

- NestJS DTO 初稿
- Controller 路径结构
- OpenAPI / Swagger 定义草稿
