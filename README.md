
<div align="center"><img src="https://github.com/user-attachments/assets/bb1c45bc-3ef9-49cc-a3ab-5a7348daaabc" alt="Peek Pop"  style="height: 80px; width: 80px;">
</div>
<h1 align="center">Peek Pop</h1>

<div align="center">
<a href="https://github.com/u-Sir/peek-pop/releases/latest"><img src="https://img.shields.io/github/v/release/u-Sir/peek-pop?label=Github&logo=github&display_name=release&link=https%3A%2F%2Fgithub.com%2Fu-Sir%2Fpeek-pop%2Freleases&link=https%3A%2F%2Fgithub.com%2Fu-Sir%2Fpeek-pop%2Freleases" alt="Github release" /></a> <a href="https://addons.mozilla.org/firefox/addon/peek_pop"><img src="https://img.shields.io/amo/v/peek_pop.svg?label=Firefox&logo=firefoxbrowser" alt="Add to Firefox"/></a> <a href="https://chrome.google.com/webstore/detail/fjllepdpgikphekgbinhpdkalliiejdh"><img src="https://img.shields.io/chrome-web-store/v/fjllepdpgikphekgbinhpdkalliiejdh.svg?label=Chrome&logo=googlechrome" alt="Add to Chrome" /></a> <a href="https://microsoftedge.microsoft.com/addons/detail/ecpgdeolbpelhdjcplojlpdmfppjljop"><img src="https://img.shields.io/badge/dynamic/json?label=Edge&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fecpgdeolbpelhdjcplojlpdmfppjljop" alt="Add to Microsoft Edge" /></a> 
</div>

<p align="center"><i>
A lightweight, open-source browser extension lets you preview, search, and save pages to read later.
</i></p>

<p align="center">
<a href="https://github.com/u-Sir/peek-pop">English</a> |
<a href="https://github.com/u-Sir/peek-pop/blob/main/docs/README-chs.md">简体中文</a> 
</p>

# Usage

### Installation

<div align="left">
<a href="https://chrome.google.com/webstore/detail/fjllepdpgikphekgbinhpdkalliiejdh"><img src="https://user-images.githubusercontent.com/72879799/229783871-ec49dba0-5c17-411b-892a-6ba0abee3fe7.svg" alt="Add to Chrome" height="64px"/></a> <a href="https://addons.mozilla.org/firefox/addon/peek_pop"><img src="https://user-images.githubusercontent.com/72879799/229780855-df16725a-f232-478d-99c2-052344601626.svg" alt="Add to Firefox" height="64px"/></a> <a href="https://microsoftedge.microsoft.com/addons/detail/ecpgdeolbpelhdjcplojlpdmfppjljop"><img src="https://user-images.githubusercontent.com/72879799/229780863-e60a44cd-a768-47d8-9755-c46075c3751b.svg" alt="Add to Microsoft Edge" height="64px"/></a>
</div>

**👉 It's recommended to visit the options page after installation to customize the settings and tailor the plugin to your needs.**

### Triggers

| Trigger                | Supported? | Modifier key  | Search or Image search  |
|--------------------------|------------|--------------------------|------------|
| Double Click (default)       | ✅ Yes     | ❌ No   | ❌ No   |
| Drag             | ✅ Yes | ✅ Optional | ✅ Optional |
| Click        | ✅ Yes | ✅ Optional | ❌ No |
| Hold        | ✅ Yes     | ❌ No   | ❌ No   |
| Hover | ✅ Yes | ✅ Optional | ✅ Optional |

👉 Supports enabling multiple trigger methods simultaneously.


### Links supported

| Location                | Supported? |
|--------------------------|------------|
| Normal page             | ✅ Yes     |
| Inside an iframe        | ✅ Yes     |
| Inside an open shadow root | ✅ Yes  |
| Inside a closed shadow root | ❌ No   |
| Inside a canvas | ❌ No   |

### Blacklist Format Examples

- **Regex format**: `/^https:\/\/example\.com\/.*$/`
- **Wildcard format**: `https://example.com/*`
- **Plain text format**: `https://example.com`

#### Common Pattern Examples
- files: 
`/\.(zip|rar|7z|exe|msi|md|pdf|docx?|xlsx?|pptx?|apk|dmg|iso)(\?.*)?$/`


- images: 
`/\.(jpg|jpeg|avif|png|svg|ico|webp|gif)(\?.*)?$/`


- videos: 
`/\.(mp4|mkv|rmvb|rm|avi|ts|mov|flv)(\?.*)?$/`

- audio: 
`/\.(mp3|flac|ogg|wav|aac)(\?.*)?$/`

- download links: 
`/^(magnet:\?xt=urn:[a-z0-9]+:[a-f0-9]{32,40}.*|https?:\/\/[^\s]+\/dl[a-zA-Z0-9\/%+=_-]+)$/`

# FAQ

### Is it possible to set a popup always on top?  
Due to browser add-on limitations, this can't be done directly by the add-on. However, you can use third-party software like **PowerToys - Always On Top** to achieve this. Don't forget to uncheck **"Close popup when origin window is focused"** on the settings page.

### Why are other actions triggered during preview?  
Try disabling other add-ons to see if the issue persists. If you're using Edge, also check **`edge://settings/superDragDrop`**. If the problem continues, please create an issue.

### Why is the add-on version not up-to-date on Add-ons Store?
The update process may take up to 7 business days due to review procedures.

### Can I customize the appearance of the preview window?  
The preview window is based on the native browser window, so customization is not supported. Firefox users may be able to adjust it using `userChrome.css`.

### Is it possible to retain the page's original drag functionality while using drag-to-preview?  
You can enable the **"Only respond when dragging to empty areas"** option in the settings to preserve the page's native drag behavior.


# Known Issues

## Not compatible with Arc/Dia

## On Firefox
When system scaling is not set to 100%, the popup window may briefly flash when it appears.

## On macOS
The preview popup window does not work properly in `fullscreen` mode.  
For best results, use the window in non-fullscreen mode.

# Source
Source code available in releases or branches.
