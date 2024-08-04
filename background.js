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
    'rememberPopupSizeAndPosition': false,
    'windowType': 'popup',
    'popupWindowsInfo': {},
    'closedByEsc': false,
    'contextItemCreated': false,
    'dragDirections': ['up', 'down', 'right', 'left'],
    'dragPx': 0,
    'imgSupport': false,
    'enableContainerIdentify': true
};

// Load user configurations from storage
async function loadUserConfigs() {
    return new Promise(resolve => {
        chrome.storage.local.get(Object.keys(configs), storedConfigs => {
            const mergedConfigs = { ...configs, ...storedConfigs };
            Object.assign(configs, mergedConfigs);
            resolve(mergedConfigs);
        });
    });
}

// Save a specific configuration
async function saveConfig(key, value) {
    configs[key] = value;
    return new Promise(resolve => {
        chrome.storage.local.set({ [key]: value }, () => {
            resolve();
        });
    });
}



// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
    loadUserConfigs().then(userConfigs => {
        const keysToSave = Object.keys(configs).filter(key => userConfigs[key] === undefined);
        Promise.all(keysToSave.map(key => saveConfig(key, configs[key])))
            .catch(error => console.error('Error during installation setup:', error));
    });
});

// Handle incoming messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

            return loadUserConfigs().then(userConfigs => {


                let popupWindowsInfo = userConfigs.popupWindowsInfo || {};


                // Filter out the 'savedPositionAndSize' key
                const filteredPopupWindowsInfo = Object.keys(popupWindowsInfo).reduce((acc, key) => {
                    if (key !== 'savedPositionAndSize') {
                        acc[key] = popupWindowsInfo[key];
                    }
                    return acc;
                }, {});

                // Check if the filtered object is empty
                if (Object.keys(filteredPopupWindowsInfo).length === 0) {
                    popupWindowsInfo[currentWindow.id] = {}; // Set the current window ID as the original window ID
                    return saveConfig('popupWindowsInfo', popupWindowsInfo).then(() => popupWindowsInfo);
                }


                // If originWindowId is already defined, just return popupWindowsInfo
                return popupWindowsInfo;

            }).then(popupWindowsInfo => {


                chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                chrome.contextMenus.onClicked.addListener(onMenuItemClicked);

                if (request.checkContextMenuItem) {
                    chrome.storage.local.get('popupWindowsInfo', (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo || {};

                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).some(windowId => {
                            return parseInt(windowId) === currentWindow.id;
                        });


                        loadUserConfigs().then(userConfigs => {
                            if (!isCurrentWindowOriginal) {
                                if (!userConfigs.contextItemCreated) {
                                    chrome.contextMenus.create({
                                        id: 'sendPageBack',
                                        title: chrome.i18n.getMessage('sendPageBack'),
                                        contexts: ['page']
                                    }, () => {
                                        if (chrome.runtime.lastError) {
                                            userConfigs.contextItemCreated = true;
                                            chrome.storage.local.set({ contextItemCreated: true }, () => {
                                                // console.log('Context menu created and contextItemCreated updated to true' + Date.now());
                                            });
                                        } else {
                                            userConfigs.contextItemCreated = true;
                                            chrome.storage.local.set({ contextItemCreated: true }, () => {
                                                // console.log('Context menu created and contextItemCreated updated to true' + Date.now());
                                            });
                                        }
                                    });
                                }

                                if (userConfigs.rememberPopupSizeAndPosition) {
                                    for (const originWindowId in popupWindowsInfo) {
                                        if (originWindowId === 'savedPositionAndSize') {
                                            continue; // Skip the savedPositionAndSize key
                                        }

                                        if (popupWindowsInfo[originWindowId][currentWindow.id]) {
                                            if (!popupWindowsInfo[originWindowId]) {
                                                popupWindowsInfo[originWindowId] = {};
                                            }
                                            popupWindowsInfo[originWindowId][currentWindow.id] = {
                                                windowType: currentWindow.type,
                                                top: currentWindow.top,
                                                left: currentWindow.left,
                                                width: currentWindow.width,
                                                height: currentWindow.height
                                            };

                                            popupWindowsInfo.savedPositionAndSize = {
                                                top: currentWindow.top,
                                                left: currentWindow.left,
                                                width: currentWindow.width,
                                                height: currentWindow.height
                                            };


                                            chrome.storage.local.set({ popupWindowsInfo }, () => {
                                                //addBoundsChangeListener(currentWindow.id, originWindowId);
                                                chrome.windows.onRemoved.addListener(windowRemovedListener);
                                            });
                                        }
                                    }
                                
                                }
                            } else {
                                // console.log('not popup window, do nothing')
                            }


                        });
                    });

                    sendResponse({ status: 'item checked' });
                }

                if (request.action === 'closeCurrentTab') {
                    chrome.storage.local.get(['popupWindowsInfo', 'contextItemCreated'], (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo;
                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).some(windowId => {
                            return parseInt(windowId) === currentWindow.id;
                        });
                        if (!isCurrentWindowOriginal) {
                            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                if (tabs.length > 0) {
                                    const currentTab = tabs[0];
                                    chrome.tabs.remove(currentTab.id);
                                }
                            });
                            if (result.contextItemCreated) {
                                chrome.contextMenus.remove('sendPageBack');
                                result.contextItemCreated = false;
                                chrome.storage.local.set({ contextItemCreated: false }, () => {
                                    // console.log('Context menu created and contextItemCreated updated to false');
                                });
                            }
                        }

                    });
                    sendResponse({ status: 'esc handled' });

                }

                if (request.action === 'windowRegainedFocus') {
                    chrome.storage.local.get(['popupWindowsInfo', 'contextItemCreated'], (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo;
                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).some(windowId => {
                            return parseInt(windowId) === currentWindow.id;
                        });
                        if (isCurrentWindowOriginal) {
                            // console.log('start check:' + isCurrentWindowOriginal)

                            const popupsToRemove = Object.keys(popupWindowsInfo[currentWindow.id] || {});

                            chrome.windows.getAll({ populate: true }, windows => {
                                windows.forEach(window => {
                                    if (popupsToRemove.includes(window.id.toString())) {
                                        chrome.windows.remove(window.id);
                                    }
                                });
                                if (result.contextItemCreated) {
                                    chrome.contextMenus.remove('sendPageBack');
                                    result.contextItemCreated = false;
                                    chrome.storage.local.set({ contextItemCreated: false }, () => {
                                        // console.log('Context menu created and contextItemCreated updated to false');
                                    });
                                }

                            });
                        }

                    });
                    sendResponse({ status: 'window focus handled' });

                }


                const zoomFactor = new Promise((resolve, reject) => {
                    chrome.tabs.getZoom(sender.tab.id, (zoom) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(zoom);
                        }
                    });
                });

                return zoomFactor.then(zoom => {
                    return Promise.all([
                        saveConfig('lastClientX', request.lastClientX * zoom),
                        saveConfig('lastClientY', request.lastClientY * zoom),
                        saveConfig('lastScreenTop', request.top * zoom),
                        saveConfig('lastScreenLeft', request.left * zoom),
                        saveConfig('lastScreenWidth', request.width * zoom),
                        saveConfig('lastScreenHeight', request.height * zoom)
                    ]);
                }).then(() => {
                    return loadUserConfigs().then(userConfigs => {
                        const { disabledUrls, rememberPopupSizeAndPosition, windowType } = userConfigs;

                        if (isUrlDisabled(sender.tab.url, disabledUrls)) {
                            sendResponse({ status: 'url disabled' });
                        } else if (request.linkUrl) {
                            handleLinkInPopup(request.linkUrl, sender.tab, currentWindow, rememberPopupSizeAndPosition, windowType).then(() => {
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

// Handle link opening in a popup
function handleLinkInPopup(linkUrl, tab, currentWindow, rememberPopupSizeAndPosition, windowType) {
    if (!isValidUrl(linkUrl)) {
        console.error('Invalid URL:', linkUrl);
        return Promise.reject(new Error('Invalid URL'));
    }

    return loadUserConfigs().then(userConfigs => {
        const {
            lastClientX, lastClientY,
            popupHeight, popupWidth, tryOpenAtMousePosition,
            lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight
        } = userConfigs;

        const defaultHeight = parseInt(popupHeight, 10) || 800;
        const defaultWidth = parseInt(popupWidth, 10) || 1000;

        let dx, dy, width = defaultWidth, height = defaultHeight;

        return new Promise((resolve, reject) => {
            if (rememberPopupSizeAndPosition) {
                chrome.storage.local.get(['popupWindowsInfo'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo;
                    const savedPositionAndSize = popupWindowsInfo.savedPositionAndSize || {};

                    if (Object.keys(savedPositionAndSize).length > 0) {
                        ({ left: dx, top: dy, width, height } = savedPositionAndSize);

                        createPopupWindow(linkUrl, tab, windowType, dx, dy, width, height, currentWindow.id, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
                    } else {
                        defaultPopupCreation(linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
                    }
                });
            } else {
                chrome.storage.local.get(['popupWindowsInfo'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo || {};
                    defaultPopupCreation(linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
                });
            }
        });
    });
}

// Function to create a popup window
function createPopupWindow(linkUrl, tab, windowType, left, top, width, height, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject) {
    chrome.storage.local.get(['enableContainerIdentify'], (result) => {
        const enableContainerIdentify = result.enableContainerIdentify !== undefined ? result.enableContainerIdentify : true;

        chrome.windows.create({
            url: linkUrl,
            type: windowType,
            top: parseInt(top, 10),
            left: parseInt(left, 10),
            width: parseInt(width, 10),
            height: parseInt(height, 10),
            focused: true,
            incognito: tab.incognito,
            ...(enableContainerIdentify && tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default' ? { cookieStoreId: tab.cookieStoreId } : {})
        }, (newWindow) => {
            if (chrome.runtime.lastError) {
                console.error('Error creating popup window:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                updatePopupInfoAndListeners(newWindow, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
            }
        });
    });
}


// Function to handle default popup creation
function defaultPopupCreation(linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject) {
    let dx, dy;

    if (tryOpenAtMousePosition) {
        dx = parseInt(lastClientX);
        dy = parseInt(lastClientY);
    } else {
        const screenWidth = lastScreenWidth || screen.width;
        const screenHeight = lastScreenHeight || screen.height;

        const centerX = (screenWidth - defaultWidth) / 2;
        const centerY = (screenHeight - defaultHeight) / 2;

        dx = parseInt(lastScreenLeft) + centerX;
        dy = parseInt(lastScreenTop) + centerY;
    }

    // Clamping dx and dy to ensure they are within the screen bounds
    dx = Math.max(lastScreenLeft, Math.min(dx, lastScreenLeft + lastScreenWidth - defaultWidth));
    dy = Math.max(lastScreenTop, Math.min(dy, lastScreenTop + lastScreenHeight - defaultHeight));


    createPopupWindow(linkUrl, tab, windowType, dx, dy, defaultWidth, defaultHeight, currentWindow.id, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
}

// Function to update popup info and add listeners
function updatePopupInfoAndListeners(newWindow, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject) {
    if (!popupWindowsInfo[originWindowId]) {
        popupWindowsInfo[originWindowId] = {};
    }
    popupWindowsInfo[originWindowId][newWindow.id] = {
        windowType: newWindow.type,
        top: newWindow.top,
        left: newWindow.left,
        width: newWindow.width,
        height: newWindow.height
    };

    if (rememberPopupSizeAndPosition) {
        popupWindowsInfo.savedPositionAndSize = {
            top: newWindow.top,
            left: newWindow.left,
            width: newWindow.width,
            height: newWindow.height
        };
    }

    chrome.storage.local.set({ popupWindowsInfo }, () => {
        // addBoundsChangeListener(newWindow.id, originWindowId);
        chrome.windows.onRemoved.addListener(windowRemovedListener);
        resolve();
    });
}

// Function to handle URL validation
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}

// Function to handle disabled URL checking
function isUrlDisabled(url, disabledUrls) {
    return disabledUrls.some(disabledUrl => url.includes(disabledUrl));
}


// Handle context menu item click
function onMenuItemClicked(info, tab) {
    if (info.menuItemId === 'sendPageBack') {
        loadUserConfigs().then(userConfigs => {
            const { popupWindowsInfo, enableContainerIdentify } = userConfigs;

            if (popupWindowsInfo && Object.keys(popupWindowsInfo).length > 0) {
                // Iterate through popupWindowsInfo to find the original window ID
                let originalWindowId = null;
                for (const originWindowId in popupWindowsInfo) {
                    if (popupWindowsInfo[originWindowId][tab.windowId]) {
                        originalWindowId = originWindowId;
                        break;
                    }
                }

                if (originalWindowId) {
                    const createData = { windowId: parseInt(originalWindowId), url: tab.url };
                    if (enableContainerIdentify && tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default') {
                        createData.cookieStoreId = tab.cookieStoreId;
                    }
                    chrome.tabs.create(createData, () => {
                        chrome.windows.get(tab.windowId, window => {
                            if (window.id) chrome.windows.remove(window.id);
                        });

                        if (userConfigs.contextItemCreated) {
                            chrome.contextMenus.remove('sendPageBack');
                            userConfigs.contextItemCreated = false;
                            chrome.storage.local.set({ contextItemCreated: false }, () => {
                                // console.log('Context menu created and contextItemCreated updated to false');
                            });
                            chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                        }

                    });
                } else {
                    //console.error('No original window ID found for current window ID in popupWindowsInfo.');
                }
            } else {
                console.error('popupWindowsInfo is empty or not properly structured.');
            }
        });
    }
}


// Listener for popup window removal
function windowRemovedListener(windowId) {
    chrome.storage.local.get('popupWindowsInfo', (result) => {
        const popupWindowsInfo = result.popupWindowsInfo || {};

        for (const originWindowId in popupWindowsInfo) {
            if (popupWindowsInfo[originWindowId][windowId]) {
                delete popupWindowsInfo[originWindowId][windowId];

                if (Object.keys(popupWindowsInfo[originWindowId]).length === 0) {
                    delete popupWindowsInfo[originWindowId];
                }

                chrome.storage.local.set({ popupWindowsInfo });
                break;
            }
        }
    });
}