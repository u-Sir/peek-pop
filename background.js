const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': false,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 1000,
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'modifiedKey': 'None',
    'originWindowId': ''
};

let contextMenuCreated = false;

async function loadUserConfigs() {
    return new Promise(resolve => {
        chrome.storage.local.get(Object.keys(configs), storedConfigs => {
            const mergedConfigs = { ...configs, ...storedConfigs };
            Object.assign(configs, mergedConfigs);
            resolve(mergedConfigs);
        });
    });
}

async function saveConfig(key, value) {
    configs[key] = value;
    return new Promise(resolve => {
        chrome.storage.local.set({ [key]: value }, () => {
            console.log(`Config saved: ${key} = ${value}`);
            resolve();
        });
    });
}

function onMenuItemClicked(info, tab) {
    if (info.menuItemId === 'sendPageBack') {
        loadUserConfigs().then(userConfigs => {
            const { originWindowId } = userConfigs;

            if (originWindowId) {
                const createData = { windowId: originWindowId, url: tab.url };

                chrome.tabs.create(createData, () => {
                    chrome.windows.get(tab.windowId, window => {
                        if (window.type === 'popup') chrome.windows.remove(window.id);
                    });
                    chrome.contextMenus.remove('sendPageBack');
                    contextMenuCreated = false;
                    chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                });
            } else {
                console.error('No original window ID found in storage.');
            }
        });
    }
}

chrome.runtime.onInstalled.addListener(() => {
    loadUserConfigs().then(userConfigs => {
        const keysToSave = Object.keys(configs).filter(key => userConfigs[key] === undefined);
        Promise.all(keysToSave.map(key => saveConfig(key, configs[key])))
            .catch(error => console.error('Error during installation setup:', error));
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message in background script:', request);

    new Promise((resolve, reject) => {
        chrome.windows.getCurrent(window => {
            if (chrome.runtime.lastError) {
                console.error('Error getting current window:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(window);
            }
        });
    })
    .then(currentWindow => {
        console.log('Current window:', currentWindow);

        return loadUserConfigs().then(userConfigs => {
            let { originWindowId } = userConfigs;

            if (!originWindowId && currentWindow.type !== 'popup') {
                originWindowId = currentWindow.id;
                return saveConfig('originWindowId', originWindowId).then(() => originWindowId);
            }

            return originWindowId;
        }).then(originWindowId => {
            chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
            chrome.contextMenus.onClicked.addListener(onMenuItemClicked);

            if (request.checkContextMenuItem) {
                if (!contextMenuCreated && currentWindow.type === 'popup') {
                    chrome.contextMenus.create({
                        id: 'sendPageBack',
                        title: chrome.i18n.getMessage('sendPageBack'),
                        contexts: ['page']
                    });
                    contextMenuCreated = true;
                } else if (currentWindow.type !== 'popup') {
                    chrome.contextMenus.remove('sendPageBack');
                    contextMenuCreated = false;
                }
                sendResponse({ status: 'context menu checked' });
            }

            if (request.action === 'windowRegainedFocus' && currentWindow.id === originWindowId) {
                chrome.windows.getAll({ populate: true }, windows => {
                    console.log('All windows:', windows);

                    windows.forEach(window => {
                        if (window.type === 'popup') {
                            chrome.windows.remove(window.id);
                        }
                    });

                    chrome.contextMenus.remove('sendPageBack');
                    contextMenuCreated = false;
                    sendResponse({ status: 'window focus handled' });
                });
            }

            return Promise.all([
                saveConfig('lastClientX', request.lastClientX),
                saveConfig('lastClientY', request.lastClientY),
                saveConfig('lastScreenTop', request.top),
                saveConfig('lastScreenLeft', request.left),
                saveConfig('lastScreenWidth', request.width),
                saveConfig('lastScreenHeight', request.height)
            ]).then(() => {
                return loadUserConfigs().then(userConfigs => {
                    const { disabledUrls } = userConfigs;

                    if (isUrlDisabled(sender.tab.url, disabledUrls)) {
                        sendResponse({ status: 'url disabled' });
                    } else if (request.linkUrl) {
                        if (currentWindow.type !== 'popup') {
                            saveConfig('originWindowId', currentWindow.id);
                        }
                        handleLinkInPopup(request.linkUrl, sender.tab, currentWindow).then(() => {
                            sendResponse({ status: 'link handled' });
                        });
                    } else {
                        sendResponse({ status: 'message processed' });
                    }
                });
            });
        });
    })
    .catch(error => {
        console.error('Error in background script:', error);
        sendResponse({ status: 'error', message: error.message });
    });

    return true; // Keeps the message channel open for async response
});


function handleLinkInPopup(linkUrl, tab, currentWindow) {
    if (!isValidUrl(linkUrl)) {
        console.error('Invalid URL:', linkUrl);
        return Promise.reject(new Error('Invalid URL'));
    }

    return loadUserConfigs().then(userConfigs => {
        const {
            lastClientX, lastClientY,
            popupHeight, popupWidth, tryOpenAtMousePosition,
            lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, devicePixelRatio
        } = userConfigs;

        const height = parseInt(popupHeight, 10) || 800;
        const width = parseInt(popupWidth, 10) || 1000;

        let dx = tryOpenAtMousePosition && lastClientX ? lastClientX - width / 2 : lastScreenLeft + (lastScreenWidth - width) / 2;
        let dy = tryOpenAtMousePosition && lastClientY ? lastClientY - height / 2 : lastScreenTop + (lastScreenHeight - height) / 2;
        dx = Math.max(lastScreenLeft, Math.min(dx, lastScreenLeft + lastScreenWidth - width));
        dy = Math.max(lastScreenTop, Math.min(dy, lastScreenTop + lastScreenHeight - height));

        console.log("tryOpenAtMousePosition: " + tryOpenAtMousePosition);
        console.log("lastScreenLeft: " + lastScreenLeft);
        console.log("lastScreenTop: " + lastScreenTop);
        console.log("lastScreenWidth: " + lastScreenWidth);
        console.log("lastScreenHeight: " + lastScreenHeight);
        console.log("dx - dy : " + dx + "-" + dy);
        console.log("devicePixelRatio: " + devicePixelRatio);

        const createData = {
            url: linkUrl,
            type: 'popup',
            width,
            height,
            left: Math.round(dx),
            top: Math.round(dy),
            incognito: tab.incognito
        };

        return chrome.windows.create(createData).catch(error => {
            console.error('Error creating popup window:', error);
        });
    });
}

function isValidUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
        return false;
    }
}

function isUrlDisabled(url, disabledUrls) {
    return disabledUrls?.some(disabledUrl => url.startsWith(disabledUrl));
}
