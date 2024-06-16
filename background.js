let lastClientX, lastClientY, originWindowId;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    lastClientX = request.lastClientX;
    lastClientY = request.lastClientY;

    chrome.storage.sync.get('disabledUrls', function(data) {
        const disabledUrls = data.disabledUrls || [];
        const currentUrl = sender.tab.url;

        if (isUrlDisabled(currentUrl, disabledUrls)) {
            return; // Do nothing if the URL is disabled
        }

        if (request.linkUrl) {
            loadUserConfigs(() => handleLinkInPopup(request.linkUrl, sender.tab.incognito));
        } else if (request.selectionText) {
            loadUserConfigs(() => handleTextSearchInPopup(request.selectionText, sender.tab.incognito));
        }
    });
});

function handleLinkInPopup(linkUrl, incognito) {
    let originalWindowIsFullscreen = false;

    chrome.windows.getCurrent(function (originWindow) {
        if (originWindow.type !== 'popup') originWindowId = originWindow.id;

        if (originWindow.state === 'fullscreen') {
            originalWindowIsFullscreen = true;
            chrome.windows.update(originWindow.id, {
                state: 'maximized'
            });
        }
    });

    let dx, dy, height, width;
    height = configs.popupHeight ?? 800;
    width = configs.popupWidth ?? 600;
    height = parseInt(height);
    width = parseInt(width);

    if (configs.tryOpenAtMousePosition === true && (lastClientX && lastClientY)) {
        dx = lastClientX - width / 2;
        dy = lastClientY - height / 2;
    } else {
        dx = window.screen.width / 2 - width / 2;
        dy = window.screen.height / 2 - height / 2;
    }

    if (dx < 0) dx = 0;
    if (dy < 0) dy = 0;
    if (dx + width > window.screen.width) dx = dx - (dx + width - window.screen.width);
    if (dy + height > window.screen.height) dy = dy - (dy + height - window.screen.height);
    dx = Math.round(dx);
    dy = Math.round(dy);

    setTimeout(function () {
        chrome.windows.create({
            url: linkUrl,
            type: 'popup',
            width: width,
            height: height,
            top: dy,
            left: dx,
            focused: true,
            incognito: incognito
        }, function (popupWindow) {
            chrome.windows.update(popupWindow.id, {
                top: dy,
                left: dx
            });

            if (configs.closeWhenFocusedInitialWindow === false) return;

            function windowFocusListener(windowId) {
                if (windowId === originWindowId) {
                    chrome.windows.onFocusChanged.removeListener(windowFocusListener);
                    chrome.windows.remove(popupWindow.id);

                    if (originalWindowIsFullscreen) {
                        chrome.windows.update(originWindow.id, {
                            state: 'fullscreen'
                        });
                    }
                }
            }

            setTimeout(function () {
                chrome.windows.onFocusChanged.addListener(windowFocusListener);
            }, 300);
        });
    }, originalWindowIsFullscreen ? 600 : 0);
}

function handleTextSearchInPopup(selectionText, incognito) {
    let originalWindowIsFullscreen = false;

    chrome.windows.getCurrent(function (originWindow) {
        if (originWindow.type !== 'popup') originWindowId = originWindow.id;

        if (originWindow.state === 'fullscreen') {
            originalWindowIsFullscreen = true;
            chrome.windows.update(originWindow.id, {
                state: 'maximized'
            });
        }
    });

    let dx, dy, height, width;
    height = configs.popupHeight ?? 800;
    width = configs.popupWidth ?? 600;
    height = parseInt(height);
    width = parseInt(width);

    if (configs.tryOpenAtMousePosition === true && (lastClientX && lastClientY)) {
        dx = lastClientX - width / 2;
        dy = lastClientY - height / 2;
    } else {
        dx = window.screen.width / 2 - width / 2;
        dy = window.screen.height / 2 - height / 2;
    }

    if (dx < 0) dx = 0;
    if (dy < 0) dy = 0;
    if (dx + width > window.screen.width) dx = dx - (dx + width - window.screen.width);
    if (dy + height > window.screen.height) dy = dy - (dy + height - window.screen.height);
    dx = Math.round(dx);
    dy = Math.round(dy);

    const searchUrl = configs.popupSearchUrl.replace('%s', encodeURIComponent(selectionText));

    setTimeout(function () {
        chrome.windows.create({
            url: searchUrl,
            type: 'popup',
            width: width,
            height: height,
            top: dy,
            left: dx,
            focused: true,
            incognito: incognito
        }, function (popupWindow) {
            chrome.windows.update(popupWindow.id, {
                top: dy,
                left: dx
            });

            if (configs.closeWhenFocusedInitialWindow === false) return;

            function windowFocusListener(windowId) {
                if (windowId === originWindowId) {
                    chrome.windows.onFocusChanged.removeListener(windowFocusListener);
                    chrome.windows.remove(popupWindow.id);

                    if (originalWindowIsFullscreen) {
                        chrome.windows.update(originWindow.id, {
                            state: 'fullscreen'
                        });
                    }
                }
            }

            setTimeout(function () {
                chrome.windows.onFocusChanged.addListener(windowFocusListener);
            }, 300);
        });
    }, originalWindowIsFullscreen ? 600 : 0);
}

function loadUserConfigs(callback) {
    chrome.storage.sync.get({
        popupHeight: 800,
        popupWidth: 600,
        tryOpenAtMousePosition: true,
        closeWhenFocusedInitialWindow: true,
        popupSearchUrl: 'https://example.com/search?q=%s',
        disabledUrls: []
    }, function (data) {
        configs = data;
        callback();
    });
}

function isUrlDisabled(url, disabledUrls) {
    return disabledUrls.some(disabledUrl => {
        if (disabledUrl.includes('*')) {
            const regex = new RegExp(disabledUrl.replace(/\*/g, '.*'));
            return regex.test(url);
        }
        return url.includes(disabledUrl);
    });
}

function saveAllSettings() {
    chrome.storage.sync.set(configs);
}
