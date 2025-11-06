const keyFor = (userId) => `convos:${userId || "guest"}`;
const activeKeyFor = (userId) => `convos_active:${userId || "guest"}`;

export function loadConvos(userId) {
  try {
    return JSON.parse(localStorage.getItem(keyFor(userId)) || "[]");
  } catch {
    return [];
  }
}

export function saveConvos(userId, convos) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(convos || []));
  } catch {}
}

export function loadActive(userId) {
  try {
    return localStorage.getItem(activeKeyFor(userId)) || "";
  } catch {
    return "";
  }
}

export function saveActive(userId, id) {
  try {
    localStorage.setItem(activeKeyFor(userId), id || "");
  } catch {}
}

export function mergeConvos(existing = [], incoming = []) {
  const map = new Map();
  [...existing, ...incoming].forEach((c) => {
    const id = String(c.id || c._id || c.username || c.email || "");
    if (!id) return;
    const prev = map.get(id) || {};
    const pick = {
      id,
      username: c.username || prev.username,
      email: c.email || prev.email,
      preview: c.preview !== undefined ? c.preview : prev.preview,
      time: c.time !== undefined ? c.time : prev.time,
      unread: c.unread !== undefined ? c.unread : prev.unread || 0,
      temp: c.temp || prev.temp || false,
    };
    map.set(id, pick);
  });
  return Array.from(map.values());
}
