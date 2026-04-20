/**
 * Геоданные для карты подрядчиков: административные центры субъектов (WGS84).
 * Округа — условные федеральные округа РФ; центр округа = среднее по меткам субъектов.
 */

export type SubjectMarkerGeo = {
  id: number;
  district: number;
  name: string;
  lat: number;
  lon: number;
};

/** Метки субъектов (координаты центров регионов / столиц республик). */
export const SUBJECT_MARKERS_GEO: SubjectMarkerGeo[] = [
  { id: 101, district: 1, name: "Москва", lat: 55.7558, lon: 37.6173 },
  { id: 102, district: 1, name: "Белгородская", lat: 50.5955, lon: 36.5873 },
  { id: 103, district: 1, name: "Брянская", lat: 53.2434, lon: 34.3639 },
  { id: 104, district: 1, name: "Владимирская", lat: 56.129, lon: 40.406 },
  { id: 105, district: 1, name: "Воронежская", lat: 51.672, lon: 39.1843 },
  { id: 106, district: 1, name: "Ивановская", lat: 57.0004, lon: 40.9739 },
  { id: 107, district: 1, name: "Тверская", lat: 56.8586, lon: 35.9119 },
  { id: 108, district: 1, name: "Калужская", lat: 54.5293, lon: 36.2754 },
  { id: 109, district: 1, name: "Костромская", lat: 57.7665, lon: 40.9269 },
  { id: 110, district: 1, name: "Курская", lat: 51.7373, lon: 36.1874 },
  { id: 111, district: 1, name: "Липецкая", lat: 52.6088, lon: 39.5996 },
  { id: 112, district: 1, name: "Московская", lat: 55.8313, lon: 37.3298 },
  { id: 113, district: 1, name: "Орловская", lat: 52.9702, lon: 36.0634 },
  { id: 114, district: 1, name: "Рязанская", lat: 54.6292, lon: 39.7365 },
  { id: 115, district: 1, name: "Смоленская", lat: 54.7826, lon: 32.0453 },
  { id: 116, district: 1, name: "Тамбовская", lat: 52.7212, lon: 41.4522 },
  { id: 117, district: 1, name: "Тульская", lat: 54.193, lon: 37.6177 },
  { id: 118, district: 1, name: "Ярославская", lat: 57.6261, lon: 39.8972 },
  { id: 201, district: 2, name: "Санкт-Петербург", lat: 59.9343, lon: 30.3351 },
  { id: 202, district: 2, name: "Архангельская", lat: 64.5399, lon: 40.5158 },
  { id: 203, district: 2, name: "Вологодская", lat: 59.2181, lon: 39.8845 },
  { id: 204, district: 2, name: "Калининградская", lat: 54.7104, lon: 20.4522 },
  { id: 205, district: 2, name: "Ленинградская", lat: 59.568, lon: 30.1283 },
  { id: 206, district: 2, name: "Мурманская", lat: 68.9585, lon: 33.0827 },
  { id: 207, district: 2, name: "Новгородская", lat: 58.5228, lon: 31.2698 },
  { id: 208, district: 2, name: "Псковская", lat: 57.8194, lon: 28.3328 },
  { id: 209, district: 2, name: "Карелия", lat: 61.785, lon: 34.3469 },
  { id: 210, district: 2, name: "Коми", lat: 61.6688, lon: 50.8364 },
  { id: 211, district: 2, name: "Ненецкий", lat: 67.638, lon: 53.0069 },
  { id: 301, district: 3, name: "Севастополь", lat: 44.6165, lon: 33.5251 },
  { id: 302, district: 3, name: "Краснодарский", lat: 45.0355, lon: 38.9753 },
  { id: 303, district: 3, name: "Астраханская", lat: 46.3497, lon: 48.0408 },
  { id: 304, district: 3, name: "Волгоградская", lat: 48.708, lon: 44.5133 },
  { id: 305, district: 3, name: "Запорожская", lat: 47.8388, lon: 35.1396 },
  { id: 306, district: 3, name: "Ростовская", lat: 47.2357, lon: 39.7015 },
  { id: 307, district: 3, name: "Херсонская", lat: 46.6354, lon: 32.6169 },
  { id: 308, district: 3, name: "Адыгея", lat: 44.6098, lon: 40.1005 },
  { id: 309, district: 3, name: "ДНР", lat: 48.0159, lon: 37.8029 },
  { id: 310, district: 3, name: "Калмыкия", lat: 46.3078, lon: 44.2698 },
  { id: 311, district: 3, name: "Крым", lat: 44.9521, lon: 34.1024 },
  { id: 312, district: 3, name: "ЛНР", lat: 48.574, lon: 39.3078 },
  { id: 401, district: 4, name: "Ставропольский", lat: 45.0445, lon: 41.969 },
  { id: 402, district: 4, name: "Ингушетия", lat: 43.1716, lon: 44.8096 },
  { id: 403, district: 4, name: "Дагестан", lat: 42.9849, lon: 47.5047 },
  { id: 404, district: 4, name: "Кабардино-Балкарская", lat: 43.4853, lon: 43.6071 },
  { id: 405, district: 4, name: "Северная Осетия-Алания", lat: 43.0246, lon: 44.6818 },
  { id: 406, district: 4, name: "Карачаево-Черкесская", lat: 44.2253, lon: 42.0578 },
  { id: 407, district: 4, name: "Чеченская", lat: 43.3183, lon: 45.6924 },
  { id: 501, district: 5, name: "Пермский", lat: 58.0105, lon: 56.2502 },
  { id: 502, district: 5, name: "Нижегородская", lat: 56.2965, lon: 43.9361 },
  { id: 503, district: 5, name: "Кировская", lat: 58.6036, lon: 49.668 },
  { id: 504, district: 5, name: "Самарская", lat: 53.1959, lon: 50.1002 },
  { id: 505, district: 5, name: "Оренбургская", lat: 51.7727, lon: 55.0987 },
  { id: 506, district: 5, name: "Пензенская", lat: 53.2007, lon: 45.0046 },
  { id: 507, district: 5, name: "Саратовская", lat: 51.5924, lon: 45.9608 },
  { id: 508, district: 5, name: "Ульяновская", lat: 54.3142, lon: 48.4031 },
  { id: 509, district: 5, name: "Башкортостан", lat: 54.7388, lon: 55.9721 },
  { id: 510, district: 5, name: "Марий Эл", lat: 56.6388, lon: 47.8908 },
  { id: 511, district: 5, name: "Мордовия", lat: 54.1874, lon: 45.1839 },
  { id: 512, district: 5, name: "Татарстан", lat: 55.7963, lon: 49.1088 },
  { id: 513, district: 5, name: "Удмуртия", lat: 56.8528, lon: 53.2069 },
  { id: 514, district: 5, name: "Чувашская", lat: 56.1439, lon: 47.2489 },
  { id: 601, district: 6, name: "Курганская", lat: 55.4444, lon: 65.3161 },
  { id: 602, district: 6, name: "Свердловская", lat: 56.8389, lon: 60.6057 },
  { id: 603, district: 6, name: "Тюменская", lat: 57.1522, lon: 65.5272 },
  { id: 604, district: 6, name: "Челябинская", lat: 55.1644, lon: 61.4368 },
  { id: 605, district: 6, name: "Ханты-Мансийский", lat: 61.0042, lon: 69.0019 },
  { id: 606, district: 6, name: "Ямало-Ненецкий", lat: 66.5303, lon: 66.6137 },
  { id: 701, district: 7, name: "Алтайский", lat: 53.3474, lon: 83.7784 },
  { id: 702, district: 7, name: "Красноярский", lat: 56.0184, lon: 92.8672 },
  { id: 703, district: 7, name: "Иркутская", lat: 52.2864, lon: 104.2807 },
  { id: 704, district: 7, name: "Кемеровская", lat: 55.3549, lon: 86.0873 },
  { id: 705, district: 7, name: "Новосибирская", lat: 55.0084, lon: 82.9357 },
  { id: 706, district: 7, name: "Омская", lat: 54.9885, lon: 73.3242 },
  { id: 707, district: 7, name: "Томская", lat: 56.4846, lon: 84.9476 },
  { id: 708, district: 7, name: "Алтай", lat: 51.9581, lon: 85.9603 },
  { id: 709, district: 7, name: "Тыва", lat: 51.7191, lon: 94.4378 },
  { id: 710, district: 7, name: "Хакасия", lat: 53.7213, lon: 91.4424 },
  { id: 801, district: 8, name: "Чукотский", lat: 64.7336, lon: 177.5153 },
  { id: 802, district: 8, name: "Еврейская", lat: 48.7947, lon: 132.9218 },
  { id: 803, district: 8, name: "Приморский", lat: 43.1155, lon: 131.8855 },
  { id: 804, district: 8, name: "Хабаровский", lat: 48.4827, lon: 135.0838 },
  { id: 805, district: 8, name: "Камчатский", lat: 53.0243, lon: 158.6435 },
  { id: 806, district: 8, name: "Забайкальский", lat: 52.034, lon: 113.4994 },
  { id: 807, district: 8, name: "Бурятия", lat: 51.8345, lon: 107.5845 },
  { id: 808, district: 8, name: "Саха", lat: 62.0339, lon: 129.7331 },
  { id: 809, district: 8, name: "Амурская", lat: 50.2907, lon: 127.5272 },
  { id: 810, district: 8, name: "Магаданская", lat: 59.5684, lon: 150.8085 },
  { id: 811, district: 8, name: "Сахалинская", lat: 46.9591, lon: 142.738 },
];

export type FederalDistrictInfo = {
  id: number;
  name: string;
  subjects: string[];
  center: [number, number];
};

const DISTRICT_SUBJECT_NAMES: { id: number; name: string; subjects: string[] }[] = [
  {
    id: 1,
    name: "Центральный",
    subjects: [
      "Москва",
      "Белгородская",
      "Брянская",
      "Владимирская",
      "Воронежская",
      "Ивановская",
      "Тверская",
      "Калужская",
      "Костромская",
      "Курская",
      "Липецкая",
      "Московская",
      "Орловская",
      "Рязанская",
      "Смоленская",
      "Тамбовская",
      "Тульская",
      "Ярославская",
    ],
  },
  {
    id: 2,
    name: "Северо-Западный",
    subjects: [
      "Санкт-Петербург",
      "Архангельская",
      "Вологодская",
      "Калининградская",
      "Ленинградская",
      "Мурманская",
      "Новгородская",
      "Псковская",
      "Карелия",
      "Коми",
      "Ненецкий",
    ],
  },
  {
    id: 3,
    name: "Южный",
    subjects: [
      "Севастополь",
      "Краснодарский",
      "Астраханская",
      "Волгоградская",
      "Запорожская",
      "Ростовская",
      "Херсонская",
      "Адыгея",
      "ДНР",
      "Калмыкия",
      "Крым",
      "ЛНР",
    ],
  },
  {
    id: 4,
    name: "Северо-Кавказский",
    subjects: [
      "Ставропольский",
      "Ингушетия",
      "Дагестан",
      "Кабардино-Балкарская",
      "Северная Осетия-Алания",
      "Карачаево-Черкесская",
      "Чеченская",
    ],
  },
  {
    id: 5,
    name: "Приволжский",
    subjects: [
      "Пермский",
      "Нижегородская",
      "Кировская",
      "Самарская",
      "Оренбургская",
      "Пензенская",
      "Саратовская",
      "Ульяновская",
      "Башкортостан",
      "Марий Эл",
      "Мордовия",
      "Татарстан",
      "Удмуртия",
      "Чувашская",
    ],
  },
  {
    id: 6,
    name: "Уральский",
    subjects: ["Курганская", "Свердловская", "Тюменская", "Челябинская", "Ханты-Мансийский", "Ямало-Ненецкий"],
  },
  {
    id: 7,
    name: "Сибирский",
    subjects: [
      "Алтайский",
      "Красноярский",
      "Иркутская",
      "Кемеровская",
      "Новосибирская",
      "Омская",
      "Томская",
      "Алтай",
      "Тыва",
      "Хакасия",
    ],
  },
  {
    id: 8,
    name: "Дальневосточный",
    subjects: [
      "Чукотский",
      "Еврейская",
      "Приморский",
      "Хабаровский",
      "Камчатский",
      "Забайкальский",
      "Бурятия",
      "Саха",
      "Амурская",
      "Магаданская",
      "Сахалинская",
    ],
  },
];

function averageCenter(districtId: number): [number, number] {
  const pts = SUBJECT_MARKERS_GEO.filter((s) => s.district === districtId);
  if (pts.length === 0) {
    return [61, 100];
  }
  const lat = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
  const lon = pts.reduce((a, p) => a + p.lon, 0) / pts.length;
  return [lat, lon];
}

/** Федеральные округа с рассчитанным центром для метки округа. */
export const FEDERAL_DISTRICTS_GEO: FederalDistrictInfo[] = DISTRICT_SUBJECT_NAMES.map((d) => ({
  ...d,
  center: averageCenter(d.id),
}));

const byDistrict = SUBJECT_MARKERS_GEO.reduce<Record<number, SubjectMarkerGeo[]>>((acc, s) => {
  if (!acc[s.district]) acc[s.district] = [];
  acc[s.district].push(s);
  return acc;
}, {});

export function getSubjectsForDistrict(districtId: number): SubjectMarkerGeo[] {
  return byDistrict[districtId] ?? [];
}

/**
 * Прямоугольник охвата карты РФ по центрам субъектов + запас по краям (ВГС-84).
 * Ограничивает просмотр только территорией России без соседних государств в кадре при типичных масштабах.
 */
export function getRussiaMapBoundsCorners(): { sw: [number, number]; ne: [number, number] } {
  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;
  for (const s of SUBJECT_MARKERS_GEO) {
    minLat = Math.min(minLat, s.lat);
    maxLat = Math.max(maxLat, s.lat);
    minLon = Math.min(minLon, s.lon);
    maxLon = Math.max(maxLon, s.lon);
  }
  const padLat = 1.1;
  const padLon = 1.35;
  minLat = Math.min(minLat - padLat, 41.0);
  maxLat = Math.max(maxLat + padLat, 81.2);
  minLon -= padLon;
  maxLon += padLon;
  if (minLon < 18.2) minLon = 18.2;
  if (maxLon > 179.6) maxLon = 179.6;
  return { sw: [minLat, minLon], ne: [maxLat, maxLon] };
}
