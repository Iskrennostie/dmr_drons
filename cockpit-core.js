(() => {
  const products = window.MDR_PRODUCTS || {};
  const order = window.MDR_MODEL_ORDER || Object.keys(products);
  const GARAGE_KEY = "mdr:garage:v1";
  const MAX_GARAGE_ITEMS = 8;
  const PROFILES = {
    heavy: { altitude: 92, autonomy: 74, payload: 100, range: 88, accuracy: 82, gps: 28, temp: 24, weight: 15.2, speed: 76 },
    ultra: { altitude: 78, autonomy: 86, payload: 45, range: 72, accuracy: 76, gps: 25, temp: 23, weight: 3.2, speed: 82 },
    fast: { altitude: 84, autonomy: 58, payload: 36, range: 68, accuracy: 74, gps: 24, temp: 26, weight: 3.8, speed: 100 },
    night: { altitude: 81, autonomy: 91, payload: 54, range: 84, accuracy: 87, gps: 29, temp: 22, weight: 4.1, speed: 67 },
    arctic: { altitude: 90, autonomy: 94, payload: 61, range: 82, accuracy: 98, gps: 32, temp: -18, weight: 3.8, speed: 63 },
    rescue: { altitude: 86, autonomy: 69, payload: 92, range: 74, accuracy: 84, gps: 30, temp: 25, weight: 8.9, speed: 72 },
    aqua: { altitude: 80, autonomy: 88, payload: 58, range: 91, accuracy: 86, gps: 31, temp: 21, weight: 4.7, speed: 70 },
    terra: { altitude: 77, autonomy: 93, payload: 64, range: 86, accuracy: 96, gps: 33, temp: 27, weight: 4.5, speed: 60 },
    steel: { altitude: 88, autonomy: 76, payload: 87, range: 89, accuracy: 100, gps: 34, temp: 28, weight: 7.2, speed: 57 },
    ember: { altitude: 83, autonomy: 64, payload: 49, range: 77, accuracy: 79, gps: 27, temp: 29, weight: 3.6, speed: 96 }
  };
  const MISSION_WEIGHTS = {
    mapping: { mapping: 6, agri: 5, industrial: 4 },
    rescue: { rescue: 7, industrial: 4, security: 3 },
    delivery: { rescue: 6, industrial: 5, marine: 2 },
    filming: { creative: 7, speed: 4, security: 2 },
    inspection: { industrial: 6, marine: 5, security: 4, mapping: 4 }
  };

  const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, value));
  const hasToken = (configuration, token) => {
    const source = [
      configuration.pack?.id,
      configuration.pack?.name,
      ...(configuration.extras || []).flatMap((item) => [item.id, item.name])
    ].join(" ").toLowerCase();
    return source.includes(token);
  };

  const defaultConfiguration = () => {
    const query = new URLSearchParams(window.location.search);
    const bodyId = document.body.dataset.product;
    const id = products[query.get("model")] ? query.get("model") : products[bodyId] ? bodyId : "ultra";
    const model = products[id] || products[order[0]];
    return {
      id: model.id,
      model,
      color: model.colors[0],
      pack: model.packages[0],
      extras: [],
      total: model.price,
      url: window.location.href
    };
  };

  const metricsFor = (configuration = defaultConfiguration()) => {
    const profile = { ...(PROFILES[configuration.id] || PROFILES.ultra) };
    const battery = hasToken(configuration, "battery") || hasToken(configuration, "energy reserve");
    const rtk = hasToken(configuration, "rtk");
    const camera = ["camera", "creator", "cinema", "thermal", "inspection", "zoom", "лидар", "камер"]
      .some((token) => hasToken(configuration, token));
    if (battery) {
      profile.autonomy = clamp(profile.autonomy + 18);
      profile.weight = Number((profile.weight + 0.8).toFixed(1));
    }
    if (rtk) {
      profile.accuracy = clamp(profile.accuracy + 27);
      profile.gps = Math.min(42, profile.gps + 6);
    }
    if (camera) {
      profile.payload = clamp(profile.payload - 4);
      profile.weight = Number((profile.weight + 0.45).toFixed(1));
    }
    return { ...profile, battery: battery ? 98 : 84, link: "ONLINE", camera: camera ? "MISSION" : "4K" };
  };

  const recommendMission = (missions = []) => {
    const selected = missions.length ? missions : ["inspection"];
    const scores = order.map((id) => {
      const model = products[id];
      const score = selected.reduce((total, mission) => total + (MISSION_WEIGHTS[mission]?.[model.category] || 1), 0);
      return { id, model, score };
    }).sort((left, right) => right.score - left.score);
    return scores[0];
  };

  const fitFor = (configuration, missions = []) => {
    const recommendation = recommendMission(missions);
    const metrics = metricsFor(configuration);
    const sameModelBonus = recommendation.id === configuration.id ? 12 : 0;
    const missionBase = 72 + Math.min(12, missions.length * 3);
    const readiness = Math.round((metrics.autonomy + metrics.accuracy + metrics.range) / 3);
    return clamp(Math.round((missionBase + readiness) / 2 + sameModelBonus), 68, 99);
  };

  const configurationUrl = (configuration = defaultConfiguration()) => {
    const url = new URL("buy.html", window.location.href);
    url.searchParams.set("model", configuration.id);
    url.searchParams.set("color", configuration.color.id);
    url.searchParams.set("package", configuration.pack.id);
    if (configuration.extras.length) url.searchParams.set("extras", configuration.extras.map((item) => item.id).join(","));
    return url.href;
  };

  const arUrl = (configuration = defaultConfiguration()) => {
    const url = new URL("ar.html", window.location.href);
    url.searchParams.set("model", configuration.id);
    url.searchParams.set("color", configuration.color.id);
    return url.href;
  };

  const loadGarage = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(GARAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, MAX_GARAGE_ITEMS) : [];
    } catch {
      return [];
    }
  };

  const saveGarage = (entry) => {
    try {
      const current = loadGarage().filter((item) => item.orderId !== entry.orderId);
      localStorage.setItem(GARAGE_KEY, JSON.stringify([entry, ...current].slice(0, MAX_GARAGE_ITEMS)));
      return true;
    } catch {
      return false;
    }
  };

  window.MDR_COCKPIT_CORE = Object.freeze({
    products,
    order,
    profiles: PROFILES,
    defaultConfiguration,
    metricsFor,
    recommendMission,
    fitFor,
    configurationUrl,
    arUrl,
    loadGarage,
    saveGarage,
    clamp
  });
})();
