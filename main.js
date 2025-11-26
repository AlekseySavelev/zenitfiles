// год в подвале
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  updateFilesInfo();
  initPanelToggles();
  initFilterButtons();
  applyPanelVisibility();
  setViewMode("cards"); // чтобы всё инициализировалось
});

// ===================== ОБЩЕЕ =====================

function formatBytes(bytes) {
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  let i = 0;
  let value = bytes;

  while (value >= 1024 && i < units.length - 1) {
    value = value / 1024;
    i++;
  }

  const fixed = value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1);
  return fixed.replace(".", ",") + " " + units[i];
}

async function updateFilesInfo() {
  const links = Array.from(document.querySelectorAll(".download-btn"));
  if (!links.length) return;

  const uniqueHrefs = [...new Set(links.map(a => a.href))];
  let totalBytes = 0;

  await Promise.all(
    uniqueHrefs.map(async (url) => {
      const linkEl = links.find(a => a.href === url);
      const sizeAttr = linkEl && linkEl.getAttribute("data-size");
      if (sizeAttr) {
        const size = parseInt(sizeAttr, 10);
        if (!isNaN(size)) totalBytes += size;
        return;
      }

      try {
        const res = await fetch(url, { method: "HEAD" });
        const len = res.headers.get("content-length");
        if (len) {
          const size = parseInt(len, 10);
          if (!isNaN(size)) totalBytes += size;
        }
      } catch (e) {
        // не удалось — просто пропускаем
      }
    })
  );

  const el = document.getElementById("files-info");
  if (!el) return;

  const count = uniqueHrefs.length;
  let text = "Доступно " + count + " файл";

  if (count % 10 === 1 && count % 100 !== 11) {
    text += "";
  } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
    text += "а";
  } else {
    text += "ов";
  }

  if (totalBytes > 0) {
    text += " • " + formatBytes(totalBytes);
  }

  el.textContent = text;
}

// ===================== ПАНЕЛИ (каталоги / видео) =====================

const PANEL_KEYS = {
  catalogs: "zf_panel_catalogs_visible",
  videos: "zf_panel_videos_visible",
};

function getPanelFlag(key, defaultValue) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultValue;
    return v !== "0";
  } catch (e) {
    return defaultValue;
  }
}

function setPanelFlag(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch (e) {
    // localStorage может быть недоступен — игнорируем
  }
}

function initPanelToggles() {
  const chCat = document.getElementById("toggle-catalogs");
  const chVid = document.getElementById("toggle-videos");

  if (chCat) {
    chCat.addEventListener("change", function () {
      setPanelFlag(PANEL_KEYS.catalogs, this.checked);
      applyPanelVisibility();
    });
  }

  if (chVid) {
    chVid.addEventListener("change", function () {
      setPanelFlag(PANEL_KEYS.videos, this.checked);
      applyPanelVisibility();
    });
  }
}

function applyPanelVisibility() {
  const catalogsOn = getPanelFlag(PANEL_KEYS.catalogs, true);
  const videosOn = getPanelFlag(PANEL_KEYS.videos, true);

  const chCat = document.getElementById("toggle-catalogs");
  const chVid = document.getElementById("toggle-videos");
  if (chCat) chCat.checked = catalogsOn;
  if (chVid) chVid.checked = videosOn;

  // Фактическое отображение делегируем фильтру
  applyFilters();
}

// ===================== ФИЛЬТРЫ =====================

let currentKindFilter = "all";
let currentTopicFilter = "all";

function shouldElementBeVisible(el) {
  const kind = (el.dataset.kind || "").toLowerCase();
  const topic = (el.dataset.topic || "").toLowerCase();
  const group = (el.dataset.group || "").toLowerCase();

  const catalogsOn = getPanelFlag(PANEL_KEYS.catalogs, true);
  const videosOn = getPanelFlag(PANEL_KEYS.videos, true);

  if (group === "catalog" && !catalogsOn) return false;
  if (group === "video" && !videosOn) return false;

  const kindOk = currentKindFilter === "all" || kind === currentKindFilter;
  const topicOk = currentTopicFilter === "all" || topic === currentTopicFilter;

  return kindOk && topicOk;
}

function applyFilters() {
  document.querySelectorAll(".file-card[data-kind]").forEach(el => {
    el.style.display = shouldElementBeVisible(el) ? "" : "none";
  });

  document.querySelectorAll(".simple-row[data-kind]").forEach(el => {
    el.style.display = shouldElementBeVisible(el) ? "" : "none";
  });
}

function initFilterButtons() {
  const kindContainer = document.getElementById("kind-filters");
  const topicContainer = document.getElementById("topic-filters");

  if (kindContainer) {
    kindContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn || !btn.dataset.kind) return;
      currentKindFilter = btn.dataset.kind;
      kindContainer.querySelectorAll(".filter-btn")
        .forEach(b => b.classList.toggle("active", b === btn));
      applyFilters();
    });
  }

  if (topicContainer) {
    topicContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn || !btn.dataset.topic) return;
      currentTopicFilter = btn.dataset.topic;
      topicContainer.querySelectorAll(".filter-btn")
        .forEach(b => b.classList.toggle("active", b === btn));
      applyFilters();
    });
  }
}

// ===================== РЕЖИМ ОТОБРАЖЕНИЯ (карточки / таблица) =====================

let currentViewMode = null; // 'cards' или 'simple'

function setViewMode(mode) {
  currentViewMode = mode;
  const cards = document.getElementById("cards-view");
  const simple = document.getElementById("simple-view");
  const btn = document.getElementById("simple-toggle-btn");

  if (mode === "simple") {
    if (cards) cards.style.display = "none";
    if (simple) simple.style.display = "block";
    if (btn) btn.textContent = "⬅ Полный вид";
  } else {
    if (cards) cards.style.display = "";
    if (simple) simple.style.display = "none";
    if (btn) btn.textContent = "☰ Упрощённый вид";
  }

  applyFilters(); // чтобы фильтры применялись и в этом режиме
}

function chooseMode(mode) {
  setViewMode(mode);
  const chooser = document.getElementById("mode-chooser");
  if (chooser) chooser.style.display = "none";
}

function toggleSimpleMode() {
  if (!currentViewMode) {
    // ещё не выбран режим — считаем, что по умолчанию карточки
    setViewMode("cards");
    const chooser = document.getElementById("mode-chooser");
    if (chooser) chooser.style.display = "none";
    return;
  }

  if (currentViewMode === "cards") {
    setViewMode("simple");
  } else {
    setViewMode("cards");
  }
}

// ===================== АДМИНКА =====================

function openAdmin() {
  const pass = prompt("Введите пароль администратора:");
  const correct = "310172431";

  if (pass === correct) {
    const panel = document.getElementById("admin-panel");
    if (panel) panel.style.display = "block";
    alert("Админ-панель разблокирована. Пролистай страницу ниже.");
    applyPanelVisibility(); // обновим состояние чекбоксов
  } else if (pass !== null) {
    alert("Неверный пароль.");
  }
}

// Сделать функции доступными из HTML
window.openAdmin = openAdmin;
window.chooseMode = chooseMode;
window.toggleSimpleMode = toggleSimpleMode;
