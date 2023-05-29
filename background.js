chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(
    sender.tab
      ? "from a content script:" + sender.tab.url
      : "from the extension"
  );
  console.log(request.type);
  switch (request.type) {
    case "REFRESH":
      location.pathname = "/";
      return;
    case "GET_CURRENT_TOKEN":
      return sendResponse({ user: window.localStorage.user });

    case "SET_CURRENT_TOKEN": {
      const { role } = request.value;
      if (role.code === "BYBSA" || role.code === "ADMIN") {
        if (window.localStorage["admin-user"]) {
          window.localStorage.setItem(
            "user",
            window.localStorage["admin-user"]
          );
          window.localStorage.removeItem("admin-user");
          return sendResponse({ msg: "Swapped back to admin" });
        }
        return sendResponse({ msg: "Already admin" });
      }
      if (window.localStorage["admin-user"]) {
        window.localStorage.setItem("user", JSON.stringify(request.value));
        return sendResponse({ msg: "already impersonating, swapped user" });
      } else {
        window.localStorage.setItem("admin-user", window.localStorage.user);
        window.localStorage.setItem("user", JSON.stringify(request.value));
        return sendResponse({ msg: "started impersonating user" });
      }
    }
  }
});
