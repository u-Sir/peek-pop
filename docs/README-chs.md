<div align="center"><img src="https://github.com/user-attachments/assets/bb1c45bc-3ef9-49cc-a3ab-5a7348daaabc" alt="Peek Pop"  style="height: 80px; width: 80px;">
</div>
<h1 align="center">Peek Pop</h1>

<div align="center">
<a href="https://github.com/u-Sir/peek-pop/releases/latest"><img src="https://img.shields.io/github/v/release/u-Sir/peek-pop?label=Github&logo=github&display_name=release&link=https%3A%2F%2Fgithub.com%2Fu-Sir%2Fpeek-pop%2Freleases&link=https%3A%2F%2Fgithub.com%2Fu-Sir%2Fpeek-pop%2Freleases" alt="Github release" /></a> <a href="https://addons.mozilla.org/firefox/addon/peek_pop"><img src="https://img.shields.io/amo/v/peek_pop.svg?label=Firefox&logo=firefoxbrowser" alt="Add to Firefox"/></a> <a href="https://chrome.google.com/webstore/detail/fjllepdpgikphekgbinhpdkalliiejdh"><img src="https://img.shields.io/chrome-web-store/v/fjllepdpgikphekgbinhpdkalliiejdh.svg?label=Chrome&logo=googlechrome" alt="Add to Chrome" /></a> <a href="https://microsoftedge.microsoft.com/addons/detail/ecpgdeolbpelhdjcplojlpdmfppjljop"><img src="https://img.shields.io/badge/dynamic/json?label=Edge&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fecpgdeolbpelhdjcplojlpdmfppjljop" alt="Add to Microsoft Edge" /></a> 
</div>

<p align="center"><i>
集预览、搜索、稍后阅读于一体的轻量开源浏览器扩展。
</i></p>

<p align="center">
<a href="https://github.com/u-Sir/peek-pop">English</a> |
<a href="https://github.com/u-Sir/peek-pop/blob/main/docs/README-chs.md">简体中文</a> 
</p>


# 使用方法

### 安装

<div align="left">
<a href="https://chrome.google.com/webstore/detail/fjllepdpgikphekgbinhpdkalliiejdh"><img src="https://user-images.githubusercontent.com/72879799/229783871-ec49dba0-5c17-411b-892a-6ba0abee3fe7.svg" alt="Add to Chrome" height="64px"/></a> <a href="https://addons.mozilla.org/firefox/addon/peek_pop"><img src="https://user-images.githubusercontent.com/72879799/229780855-df16725a-f232-478d-99c2-052344601626.svg" alt="Add to Firefox" height="64px"/></a> <a href="https://microsoftedge.microsoft.com/addons/detail/ecpgdeolbpelhdjcplojlpdmfppjljop"><img src="https://user-images.githubusercontent.com/72879799/229780863-e60a44cd-a768-47d8-9755-c46075c3751b.svg" alt="Add to Microsoft Edge" height="64px"/></a>
</div>

**👉 安装后建议打开选项页，根据需要自定义设置，让插件更符合你的使用习惯。**

### 触发方式

| 触发方式                | 状态 | 修饰键 | 以图搜图 |
|--------------------------|------------|------------|------------|
| 拖拽（默认）             | ✅ 支持 | ✅ 可选 | ✅ 可选 |
| 单击        | ✅ 支持 | ✅ 可选 | ❌ 不支持 |
| 双击        | ✅ 支持 | ❌ 不支持 | ❌ 不支持 |
| 长按        | ✅ 支持 | ❌ 不支持 | ❌ 不支持 |
| 悬停 | ✅ 支持 | ✅ 可选 | ✅ 可选 |

👉 支持同时启用多种触发方式。

### 支持的链接位置

| 链接位置                | 是否支持 |
|--------------------------|------------|
| 普通网页             | ✅ 支持     |
| iframe 内部        | ✅ 支持     |
| 开放的 shadow root 内部 | ✅ 支持  |
| 关闭的 shadow root 内部 | ❌ 不支持   |

👉 目前除 **关闭的 shadow root** 内的链接外，其他位置的链接均支持预览。

### 黑名单格式示例

- **正则格式**：`/^https:\/\/example\.com\/.*$/`
- **通配符格式**：`https://example.com/*`
- **纯文本格式**：`https://example.com`

#### 常见匹配模式示例
- 文件类：  
`/\.(zip|rar|7z|exe|msi|md|pdf|docx?|xlsx?|pptx?|apk|dmg|iso)(\?.*)?$/`

- 图片类：  
`/\.(jpg|jpeg|avif|png|svg|ico|webp|gif)(\?.*)?$/`

- 视频类：  
`/\.(mp4|mkv|rmvb|rm|avi|ts|mov|flv)(\?.*)?$/`

- 音频类：  
`/\.(mp3|flac|ogg|wav|aac)(\?.*)?$/`

- 下载链接类：  
`/^(magnet:\?xt=urn:[a-z0-9]+:[a-f0-9]{32,40}.*|https?:\/\/[^\s]+\/dl[a-zA-Z0-9\/%+=_-]+)$/`

# 常见问题

### 能否设置弹窗始终置顶？  
由于浏览器扩展的限制，插件无法直接实现此功能。  
你可以使用第三方软件，如 **PowerToys - Always On Top** 来实现。  
另外，记得在设置页面中取消勾选 **“当原页面获得焦点时关闭弹窗”**。

### 为什么预览时会触发其他动作？  
请尝试禁用其他插件测试是否仍会出现。  
如果你使用的是 Edge，请检查 **`edge://settings/superDragDrop`**。  
若问题仍存在，请提交 issue 反馈。

### 为什么 Microsoft Edge 插件版本不是最新的？  
由于审核流程，更新可能会延迟约 7 个工作日。

### 能否自定义预览窗口的外观？  
预览窗口基于浏览器原生窗口，暂不支持自定义样式。  
Firefox 用户可尝试通过 `userChrome.css` 进行调整。

### 能否在使用拖拽预览时保留页面原生的拖拽功能？  
你可以在设置中启用 **“仅在拖拽到空白区域时响应”** 选项，以保留网页原生的拖拽行为。

# 已知问题

## 不兼容 Arc / Dia 

## 在 Firefox 上
当系统缩放比例不是 100% 时，弹窗可能在出现时闪一下。

## 在 macOS 上
预览弹窗在 `全屏模式` 下无法正常工作。  
建议在非全屏模式下使用。

# 源码
源代码可在发布版本或分支中获取。
