
<div align="center"><img src="https://github.com/user-attachments/assets/bb1c45bc-3ef9-49cc-a3ab-5a7348daaabc" alt="Peek Pop"  style="height: 80px; width: 80px;">
</div>
<h1 align="center">Peek Pop</h1>

<div align="center">

[![](https://img.shields.io/github/v/release/u-Sir/peek-pop?label=Release&logo=github&display_name=release&link=https%3A%2F%2Fgithub.com%2Fu-Sir%2Fpeek-pop%2Freleases&link=https%3A%2F%2Fgithub.com%2Fu-Sir%2Fpeek-pop%2Freleases)](https://github.com/u-Sir/peek-pop/releases/latest)
[![](https://img.shields.io/amo/v/peek_pop.svg?label=Firefox%20browser%20Add-ons&logo=firefoxbrowser)](https://addons.mozilla.org/firefox/addon/peek_pop)
[![](https://img.shields.io/badge/dynamic/json?label=Microsoft%20Edge%20Add-ons&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fecpgdeolbpelhdjcplojlpdmfppjljop)](https://microsoftedge.microsoft.com/addons/detail/ecpgdeolbpelhdjcplojlpdmfppjljop)
[![](https://img.shields.io/chrome-web-store/v/fjllepdpgikphekgbinhpdkalliiejdh.svg?label=Chrome%20Web%20Store&logo=googlechrome)](https://chrome.google.com/webstore/detail/fjllepdpgikphekgbinhpdkalliiejdh)

</div>

An open-source add-on for previewing, searching, and collecting links to read later in a popup window. Source code available in releases or branches.


# Usage

## Blacklist Format Examples

- **Regex format**: `/^https:\/\/example\.com\/.*$/`
- **Wildcard format**: `https://example.com/*`
- **Plain text format**: `https://example.com`

## Modifying Plugin Shortcuts

- **Chrome**: Go to the settings page: `chrome://extensions/shortcuts`
- **Firefox**: Go to `about:addons`, click the gear icon, then select "Manage Extension Shortcuts"


# FAQ

## Is it possible to set a popup always on top?  
Due to browser add-on limitations, this can't be done directly by the add-on. However, you can use third-party software like **PowerToys** to achieve this. Don't forget to uncheck **"Close popup when origin window is focused"** on the settings page.

## Why are other actions triggered during preview?  
Try disabling other add-ons to see if the issue persists. If you're using Edge, also check **`edge://settings/superDragDrop`**. If the problem continues, please create an issue.

## Why is the add-on version not up-to-date on Microsoft Edge Add-ons?
The update process may take up to 7 business days due to review procedures.

## Can I customize the appearance of the preview window?  
The preview window is based on the native browser window, so customization is not supported. Firefox users may be able to adjust it using `userChrome.css`.

## Is it possible to retain the page's original drag functionality while using drag-to-preview?  
You can enable the **"Only respond when dragging to empty areas"** option in the settings to preserve the page's native drag behavior.

