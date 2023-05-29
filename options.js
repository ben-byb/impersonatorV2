let site_preferences;
function saveOptions() {
  const save = document.getElementById("save");
  const reset = document.getElementById("reset");
  save.disabled = true;
  reset.disabled = true;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "GET_CURRENT_TOKEN" },
      function (response) {
        if (!response) {
          return;
        }

        const { host } = new URL(tabs[0].url);
        const prefs = site_preferences[host];
        if (!prefs) {
          site_preferences[host] = { users: [] };
          prefs = site_preferences[host];
          writePreferences(() => {});
        }
        if (!prefs.users.some((user) => user === response.user)) {
          prefs.users.push(response.user);
        }
        site_preferences[host] = prefs;
        writePreferences(function () {
          save.disabled = false;
          reset.disabled = false;
          refreshUsers();
        });
      }
    );
  });
}

function writePreferences(callback) {
  return chrome.storage.sync.set({ site_preferences }, callback);
}

function resetOptions() {
  return chrome.tabs.query(
    { active: true, currentWindow: true },
    function (tabs) {
      const { host } = new URL(tabs[0].url);
      const save = document.getElementById("save");
      const reset = document.getElementById("reset");
      save.disabled = true;
      reset.disabled = true;
      site_preferences[host] = { users: [] };
      writePreferences(function () {
        save.disabled = false;
        reset.disabled = false;
        refreshUsers();
      });
    }
  );
}

function swapTokensWithUser(user) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "SET_CURRENT_TOKEN", value: user },
      function (response) {
        console.log(response);
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "REFRESH" },
          function (responseTwo) {
            console.log(responseTwo);
          }
        );
      }
    );
  });
}

function refreshUsers() {
  return chrome.tabs.query(
    { active: true, currentWindow: true },
    function (tabs) {
      applyPreferences(tabs[0]);
    }
  );
}
async function applyPreferences(Tab) {
  const { host } = new URL(Tab.url);
  let prefs = site_preferences[host];
  console.log({ prefs: !!prefs, host });
  // Get current env
  const currentEnvironment = await getEnvironment();
  if (!isBybEnv(currentEnvironment)) {
    document.getElementById("save").disabled = true;
    document.getElementById("reset").disabled = true;
  }
  if (!prefs) {
    site_preferences[host] = { users: [] };
    prefs = site_preferences[host];
    writePreferences(() => {});
  }
  const { users } = prefs;
  const peopleRegion = document.getElementById("people");
  const saveRegion = document.getElementById("saveRegion");

  while (peopleRegion.firstChild) {
    peopleRegion.removeChild(peopleRegion.firstChild);
  }
  users.forEach((userJSON) => {
    const user = JSON.parse(userJSON);
    const userElem = document.createElement("div");
    userElem.classList.add("person");
    userElem.innerText = `${user.first_name} ${user.last_name} - ${user.role.label}`;
    userElem.addEventListener("click", () => {
      swapTokensWithUser(user);
    });
    peopleRegion.appendChild(userElem);
  });
  peopleRegion.classList.add("loaded");
  saveRegion.classList.add("loaded");
}

function restoreOptions() {
  chrome.storage.sync.get(
    {
      site_preferences: {},
    },

    function (items) {
      site_preferences = items.site_preferences;

      refreshUsers();
      renderEnvironmentName();
      renderBadge();
    }
  );
}

async function renderEnvironmentName() {
  const currentEnvironment = await getEnvironment();
  const environmentName = document.getElementById("backyardEnvironment");
  if (!isBybEnv(currentEnvironment)) {
    environmentName.replaceWith(
      document.createTextNode(`Website Not Supported.`)
    );
  } else {
    environmentName.appendChild(
      document.createTextNode(` (${currentEnvironment.toUpperCase()})`)
    );
  }
}

function renderBadge() {
  getEnvironment().then((envName) => {
    chrome.action.setBadgeText({ text: envName });
    chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
    chrome.action.setBadgeTextColor({ color: [255, 255, 255, 255] });
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("reset").addEventListener("click", resetOptions);

const isBybEnv = (environment) => {
  if (
    environment.includes(ENVIRONMENT.LOCAL) ||
    environment.includes(ENVIRONMENT.DEV) ||
    environment.includes(ENVIRONMENT.QA) ||
    environment.includes(ENVIRONMENT.STAGING) ||
    environment.includes(ENVIRONMENT.PRODUCTION)
  ) {
    return true;
  }
  return false;
};

const getEnvironment = () => {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const { host } = new URL(tabs[0].url);
      if (host.includes("3001")) resolve(ENVIRONMENT.LOCAL);
      if (host.includes(ENVIRONMENT.DEV)) resolve(ENVIRONMENT.DEV);
      if (host.includes(ENVIRONMENT.QA)) resolve(ENVIRONMENT.QA);
      if (host.includes(ENVIRONMENT.STAGING)) resolve(ENVIRONMENT.STAGING);
      if (!host.includes("-") && host.includes("backyard"))
        resolve(ENVIRONMENT.PRODUCTION);
      resolve("");
    });
  });
};

const ENVIRONMENT = {
  LOCAL: "local",
  DEV: "dev",
  QA: "qa",
  STAGING: "staging",
  PRODUCTION: "production",
};
