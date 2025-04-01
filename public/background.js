chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

console.log("loaded background");

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-search") {
    console.log("clicked");
    createWindow();
  }
});

function createWindow() {
  chrome.system.display.getInfo((displays) => {
    const primaryDisplay = displays.find((d) => d.isPrimary) || displays[0];
    const screenWidth = primaryDisplay.workArea.width;
    const screenHeight = primaryDisplay.workArea.height;

    const width = 800;
    const height = 600;

    const left = Math.round(screenWidth / 2 - width / 2);
    const top = Math.round(screenHeight / 2 - height / 2);

    chrome.windows.create({
      url: chrome.runtime.getURL("index.html"),
      type: "popup",
      width,
      height,
      top,
      left,
      focused: true,
    });
  });
}
