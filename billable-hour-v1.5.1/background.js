chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL('window-full.html');

  chrome.windows.create({
    url,
    type: 'popup',
    width: 450,
    height: 660,
    focused: true
  }, () => {
    const error = chrome.runtime.lastError;
    if (!error) return;

    console.error('Failed to open popup window:', error.message);
    chrome.tabs.create({ url });
  });
});
