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
let sendPageBackMenuItemId = 'sendPageBack';

function loadUserConfigs() {
    return new Promise(resolve => {
        chrome.storage.local.get(Object.keys(configs), storedConfigs => {
            const mergedConfigs = { ...configs, ...storedConfigs };
            Object.assign(configs, mergedConfigs);
            resolve(mergedConfigs);
        });
    });
}

function saveConfig(key, value) {
    configs[key] = value;
    return new Promise(resolve => {
        chrome.storage.local.set({ [key]: value }, () => {
            console.log(`Config saved: ${key} = ${value}`);
            resolve();
        });
    });
}

async function createContextMenuIfNeeded(windowType) {
    const userConfigs = await loadUserConfigs();

    if (windowType === 'popup' && !contextMenuCreated) {
        chrome.contextMenus.create({
            id: sendPageBackMenuItemId,
            title: chrome.i18n.getMessage('sendPageBack'),
            contexts: ['page']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error creating context menu item:', chrome.runtime.lastError.message);
            } else {
                contextMenuCreated = true;
            }
        });
    } else if (windowType !== 'popup' && contextMenuCreated) {
        chrome.contextMenus.remove(sendPageBackMenuItemId, () => {
            if (chrome.runtime.lastError && chrome.runtime.lastError.message !== 'Cannot find menu item with id sendPageBack') {
                console.error('Error removing context menu item:', chrome.runtime.lastError.message);
            } else {
                contextMenuCreated = false;
            }
        });
    }
}

async function onMenuItemClicked(info, tab) {
    if (info.menuItemId === sendPageBackMenuItemId) {
        const userConfigs = await loadUserConfigs();
        const { originWindowId } = userConfigs;

        if (originWindowId) {
            const createData = { windowId: originWindowId, url: tab.url };

            await chrome.tabs.create(createData);
            chrome.windows.get(tab.windowId, window => {
                if (window.type === 'popup') chrome.windows.remove(window.id);
            });
            chrome.contextMenus.remove(sendPageBackMenuItemId, () => {
                if (chrome.runtime.lastError && chrome.runtime.lastError.message !== 'Cannot find menu item with id sendPageBack') {
                    console.error('Error removing context menu item:', chrome.runtime.lastError.message);
                } else {
                    contextMenuCreated = false;
                }
            });
        } else {
            console.error('No original window ID found in storage.');
        }
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    try {
        const userConfigs = await loadUserConfigs();
        const keysToSave = Object.keys(configs).filter(key => userConfigs[key] === undefined);
        await Promise.all(keysToSave.map(key => saveConfig(key, configs[key])));
    } catch (error) {
        console.error('Error during installation setup:', error);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message in background script:', request);

    handleIncomingMessage(request, sender, sendResponse);

    return true; // Keeps the message channel open for async response
});

async function handleIncomingMessage(request, sender, sendResponse) {
    try {
        const currentWindow = await getCurrentWindow();
        console.log('Current window:', currentWindow);

        await createContextMenuIfNeeded(currentWindow.type);

        const userConfigs = await loadUserConfigs();
        let { originWindowId } = userConfigs;

        if (!originWindowId && currentWindow.type !== 'popup') {
            originWindowId = currentWindow.id;
            await saveConfig('originWindowId', originWindowId);
            console.log('Set and stored originWindowId:', originWindowId);
        }

        chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
        chrome.contextMenus.onClicked.addListener(onMenuItemClicked);

        if (request.checkContextMenuItem) {
            sendResponse({ status: 'context menu checked' });
        }

        if (request.action === 'windowRegainedFocus' && currentWindow.id === originWindowId) {
            const windows = await getAllWindows();
            console.log('All windows:', windows);

            for (const window of windows) {
                if (window.type === 'popup') {
                    await new Promise(resolve => chrome.windows.remove(window.id, resolve));
                }
            }
            chrome.contextMenus.remove(sendPageBackMenuItemId, () => {
                if (chrome.runtime.lastError && chrome.runtime.lastError.message !== 'Cannot find menu item with id sendPageBack') {
                    console.error('Error removing context menu item:', chrome.runtime.lastError.message);
                } else {
                    contextMenuCreated = false;
                    sendResponse({ status: 'window focus handled' });
                }
            });
        }

        await Promise.all([
            saveConfig('lastClientX', request.lastClientX),
            saveConfig('lastClientY', request.lastClientY),
            saveConfig('lastScreenTop', request.top),
            saveConfig('lastScreenLeft', request.left),
            saveConfig('lastScreenWidth', request.width),
            saveConfig('lastScreenHeight', request.height)
        ]);

        const { disabledUrls } = userConfigs;
        if (isUrlDisabled(sender.tab.url, disabledUrls)) {
            sendResponse({ status: 'url disabled' });
        } else if (request.linkUrl) {
            if (currentWindow.type !== 'popup') {
                await saveConfig('originWindowId', currentWindow.id); // Always update originWindowId before handling link
            }
            await handleLinkInPopup(request.linkUrl, sender.tab, currentWindow);
            sendResponse({ status: 'link handled' });
        } else {
            sendResponse({ status: 'message processed' });
        }
    } catch (error) {
        console.error('Error in background script:', error);
        sendResponse({ status: 'error', message: error.message });
    }
}

function getCurrentWindow() {
    return new Promise((resolve, reject) => {
        chrome.windows.getCurrent(window => {
            if (chrome.runtime.lastError) {
                console.error('Error getting current window:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(window);
            }
        });
    });
}

function getAllWindows() {
    return new Promise((resolve, reject) => {
        chrome.windows.getAll({ populate: true }, windows => {
            if (chrome.runtime.lastError) {
                console.error('Error getting all windows:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(windows);
            }
        });
    });
}

async function handleLinkInPopup(linkUrl, tab, currentWindow) {
    if (!isValidUrl(linkUrl)) {
        console.error('Invalid URL:', linkUrl);
        return;
    }

    const userConfigs = await loadUserConfigs();
    const {
        lastClientX, lastClientY,
        popupHeight, popupWidth, tryOpenAtMousePosition,
        lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight
    } = userConfigs;

    const height = parseInt(popupHeight, 10) || 800;
    const width = parseInt(popupWidth, 10) || 1000;

    let dx = tryOpenAtMousePosition && lastClientX ? lastClientX - width / 2 : lastScreenLeft + (lastScreenWidth - width) / 2;
    let dy = tryOpenAtMousePosition && lastClientY ? lastClientY - height / 2 : lastScreenTop + (lastScreenHeight - height) / 2;
    dx = Math.max(lastScreenLeft, Math.min(dx, lastScreenLeft + lastScreenWidth - width));
    dy = Math.max(lastScreenTop, Math.min(dy, lastScreenTop + lastScreenHeight - height));

    const createData = {
        url: linkUrl,
        type: 'popup',
        width,
        height,
        left: Math.round(dx),
        top: Math.round(dy),
        incognito: tab.incognito
    };

    try {
        await chrome.windows.create(createData);
    } catch (error) {
        console.error('Error creating popup window:', error);
    }
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

chrome.alarms.onAlarm.addListener(async alarm => {
    const alarmName = alarm.name;
    if (alarmName.startsWith('popupLinkAlarm_')) {
        const data = await new Promise(resolve => chrome.storage.local.get(alarmName, resolve));
        const { dx, dy, width, height, incognito, linkUrl } = data[alarmName];
        const createData = { url: linkUrl, type: 'popup', width, height, left: dx, top: dy, incognito };

        try {
            await chrome.windows.create(createData);
            await new Promise(resolve => chrome.storage.local.remove(alarmName, resolve));
        } catch (error) {
            console.error('Error creating popup window:', error);
        }
    }
});
