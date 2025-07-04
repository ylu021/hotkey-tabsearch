import { useEffect, useState } from "react";
import { groupBy } from "lodash"; // or write a small util

const highPriorityDomains = [
  "gmail.com",
  "calendar.google.com",
  "notion.so",
  "docs.google.com",
  "drive.google.com",
  "github.com",
  "figma.com",
  "slack.com",
  "messenger.com",
  "linkedin.com",
  "youtube.com",
  "reddit.com",
  "x.com",
  "chat.openai.com",
  "medium.com",
  "stackoverflow.com",
];

const domainLabels: Record<string, string> = {
  "gmail.com": "Gmail",
  "calendar.google.com": "Google Calendar",
  "docs.google.com": "Google Docs",
  "drive.google.com": "Google Drive",
  "notion.so": "Notion",
  "github.com": "GitHub",
  "figma.com": "Figma",
  "slack.com": "Slack",
  "messenger.com": "Messenger",
  "linkedin.com": "LinkedIn",
  "youtube.com": "YouTube",
  "reddit.com": "Reddit",
  "x.com": "X (Twitter)",
  "chat.openai.com": "ChatGPT",
  "medium.com": "Medium",
  "stackoverflow.com": "Stack Overflow",
};

function Search() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    chrome?.windows?.getCurrent({ populate: true }, (currentWindow) => {
      chrome.tabs.query({}, (allTabs) => {
        const popupTabId = currentWindow.tabs?.[0]?.id;
        const filteredTabs = allTabs.filter((tab) => tab.id !== popupTabId);
        setTabs(filteredTabs);
      });
    });
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? tabs.filter((tab) => {
        const title = tab.title?.toLowerCase() || "";
        const url = tab.url?.toLowerCase() || "";
        let hostname = "";
        const label = domainLabels[hostname] || "";

        try {
          const parsedUrl = new URL(tab.url || "");
          hostname = parsedUrl.hostname.replace(/^www\./, "");
        } catch {
          // Skip hostname if URL invalid
        }

        return (
          title.includes(normalizedQuery) ||
          url.includes(normalizedQuery) ||
          hostname.includes(normalizedQuery) ||
          label.toLowerCase().includes(normalizedQuery)
        );
      })
    : tabs;

  useEffect(() => {
    const handleBlur = () => {
      window.close();
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActiveIndex(0);
  };

  const handleArrowNav = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % flatTabList.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (activeIndex != 0) {
          setActiveIndex(
            (prev) => (prev - 1 + flatTabList.length) % flatTabList.length
          );
        }
        break;
      case "Enter":
        e.preventDefault();
        const selected = flatTabList[activeIndex];
        if (selected?.id) {
          switchToTab(selected.id);
        }
        break;
      case "Escape":
        e.preventDefault();
        window.close();
        break;
    }
  };

  const switchToTab = (id: number | undefined) => {
    chrome?.tabs?.update(id!, { active: true }, () => {
      chrome.scripting.executeScript({
        target: { tabId: id! },
        func: () => {
          const el = document.querySelector(
            "input, textarea, [contenteditable]"
          );
          if (el) (el as HTMLElement).focus();
        },
      });
    });
    window.close();
  };

  const groupedTabs = groupBy(filtered, (tab: chrome.tabs.Tab) => {
    try {
      const url = new URL(tab.url ?? "");
      return url.hostname.replace(/^www\./, "");
    } catch {
      return "Other";
    }
  });

  const sortedGroupKeys = Object.keys(groupedTabs).sort((a, b) => {
    const rank = (domain: string) => {
      if (domain.toLowerCase() === "newtab") return 2; // very bottom
      if (domain.toLowerCase() === "other") return 1; // second to last
      const index = highPriorityDomains.indexOf(domain);
      return index !== -1 ? -100 + index : 0; // high priority goes to the top
    };

    const rankA = rank(a);
    const rankB = rank(b);

    if (rankA !== rankB) return rankA - rankB;

    return a.localeCompare(b); // fallback alphabetical
  });

  const prettyLabel = (domain: string) => {
    return (
      domainLabels[domain] ??
      domain
        .replace(/^www\./, "")
        .replace(/\..*$/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  const flatTabList = sortedGroupKeys.flatMap((group) => groupedTabs[group]);

  return (
    <div
      className="
      w-full 
      h-screen 
      bg-white
      dark:bg-[#111]
      text-black
      dark:text-white
      rounded-2xl 
      p-4 
      shadow-2xl
      relative
      "
    >
      <div className="fixed left-0 px-6 pt-6 z-10 w-full">
        <input
          autoFocus
          value={query}
          onChange={handleChange}
          onKeyDown={handleArrowNav}
          placeholder="Search tabs..."
          className="
            w-full 
            p-3 
            text-base 
            rounded-lg 
            bg-gray-100
            dark:bg-[#222] 
            text-black
            dark:text-white 
            outline-none
          "
        />
      </div>
      <div className="h-[72px]" />
      <ul
        className="mt-4 space-y-1 text-white overflow-y-auto flex-1"
        style={{ maxHeight: "calc(100% - 72px)" }}
      >
        {sortedGroupKeys.map((domain) => (
          <li key={domain}>
            <div className="text-sm font-semibold pb-1 mb-2 border-b text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700">
              {prettyLabel(domain)}
            </div>
            <ul className="space-y-1">
              {groupedTabs[domain].map((tab) => (
                <li
                  key={tab.id}
                  onClick={() => switchToTab(tab.id)}
                  className={`text-black dark:text-white text-sm p-3 rounded-lg cursor-pointer transition-colors ${
                    tab.id === flatTabList[activeIndex]?.id
                      ? "bg-gray-200 dark:bg-[#333]"
                      : "hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                  }`}
                >
                  <img
                    src={tab.favIconUrl}
                    className="w-4 h-4 inline-block mr-2 align-middle"
                    onError={(e) => {
                      // fallback: hide if loading fails
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {tab.title}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Search;
