// Marta's catalogue: 36 icons, each a real SVG file from lucide-static (ISC license).
import * as lucide from 'lucide-static';

const warm = { bg: '#fff4d6', fg: '#d98a00' };
const red = { bg: '#ffe6ea', fg: '#e0344f' };
const green = { bg: '#e3f6e8', fg: '#2f9450' };
const blue = { bg: '#e3f3fb', fg: '#1d8ab5' };
const violet = { bg: '#efe8ff', fg: '#7148d6' };
const brown = { bg: '#f6ece4', fg: '#8a5a3c' };

const LIST = [
  ['sun', 'Sun', 'Weather', 'Sun', warm],
  ['coffee', 'Coffee', 'Food', 'Coffee', brown],
  ['tram', 'Tram 28', 'Lisbon', 'TramFront', warm],
  ['heart', 'Heart', 'Life', 'Heart', red],
  ['bike', 'Bike', 'Travel', 'Bike', green],
  ['camera', 'Camera', 'Life', 'Camera', blue],
  ['sunrise', 'Sunrise', 'Weather', 'Sunrise', warm],
  ['leaf', 'Leaf', 'Nature', 'Leaf', green],
  ['sailboat', 'Sailboat', 'Lisbon', 'Sailboat', blue],
  ['cat', 'Cat', 'Life', 'Cat', violet],
  ['croissant', 'Pastel', 'Lisbon', 'Croissant', warm],
  ['cloud-sun', 'Sunny spells', 'Weather', 'CloudSun', blue],
  ['flower', 'Flower', 'Nature', 'Flower2', red],
  ['star', 'Star', 'Life', 'Star', warm],
  ['waves', 'Waves', 'Nature', 'Waves', blue],
  ['sunset', 'Sunset', 'Weather', 'Sunset', red],
  ['tree', 'Pine', 'Nature', 'TreePine', green],
  ['wine', 'Wine', 'Food', 'Wine', violet],
  ['plane', 'Plane', 'Travel', 'Plane', blue],
  ['moon', 'Moon', 'Weather', 'Moon', violet],
  ['map-pin', 'Pin', 'Travel', 'MapPin', red],
  ['fish', 'Sardine', 'Lisbon', 'Fish', blue],
  ['sun-medium', 'Sun, soft', 'Weather', 'SunMedium', warm],
  ['mountain', 'Mountain', 'Nature', 'Mountain', green],
  ['cake', 'Cake', 'Food', 'Cake', red],
  ['umbrella', 'Umbrella', 'Weather', 'Umbrella', violet],
  ['palm', 'Palm', 'Travel', 'Palmtree', green],
  ['bird', 'Bird', 'Nature', 'Bird', blue],
  ['cherry', 'Cherry', 'Food', 'Cherry', red],
  ['house', 'Home', 'Life', 'House', brown],
  ['drizzle', 'Drizzle', 'Weather', 'CloudDrizzle', blue],
  ['music', 'Fado', 'Lisbon', 'Music', violet],
  ['snow', 'Snow', 'Weather', 'Snowflake', blue],
  ['ice-cream', 'Ice cream', 'Food', 'IceCreamCone', red],
  ['storm', 'Storm', 'Weather', 'CloudLightning', violet],
  ['cloud', 'Cloud', 'Weather', 'Cloud', blue],
];

export const CATEGORIES = ['All', 'Weather', 'Food', 'Travel', 'Nature', 'Lisbon', 'Life'];

// The SVG an agent or a person gets: stroke in the icon's own colour, no class attribute.
function colour(svg, fg) {
  return svg
    .replace(/\s*class="[^"]*"/, '')
    .replace('stroke="currentColor"', `stroke="${fg}"`)
    .replace(/\n\s*/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

export const ICONS = LIST.map(([id, name, category, lucideName, c]) => ({
  id,
  name,
  category,
  bg: c.bg,
  fg: c.fg,
  svg: colour(lucide[lucideName], c.fg),
}));

export const byId = new Map(ICONS.map((i) => [i.id, i]));

export function search(q) {
  const s = String(q ?? '').trim().toLowerCase();
  if (!s) return ICONS;
  return ICONS.filter((i) => i.name.toLowerCase().includes(s) || i.id.includes(s) || i.category.toLowerCase() === s);
}
