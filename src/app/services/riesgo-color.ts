export const NO_DATA_COLOR = '#94a3b8';

export type DataExpression =
  | string
  | number
  | boolean
  | Array<string | number | boolean | DataExpression>
  | Record<string, unknown>;

export function buildFillColor(
  accent: string,
  dark: boolean,
): DataExpression {
  const [low, mid, high] = riskGradient(accent, dark);
  const plano = plainColor(accent, dark);
  return [
    'case',
    ['==', ['typeof', ['get', 'riesgo_rank']], 'number'],
    ['interpolate', ['linear'], ['get', 'riesgo_rank'], 0, low, 0.5, mid, 1, high],
    ['case', ['==', ['get', 'plano'], true], plano, NO_DATA_COLOR],
  ];
}

export function riskGradient(accent: string, dark: boolean): [string, string, string] {
  const base = oklchToHex(accent);
  const low = mixHex(dark ? '#0f172a' : '#ffffff', base, 0.4);
  const high = mixHex(base, dark ? '#f8fafc' : '#000000', dark ? 0.35 : 0.3);
  return [low, base, high];
}

export function plainColor(accent: string, dark: boolean): string {
  return mixHex(dark ? '#0f172a' : '#ffffff', oklchToHex(accent), 0.22);
}

export function riesgoStop(
  rank: number | null,
  accent: string,
  dark: boolean,
): string {
  const [low, mid, high] = riskGradient(accent, dark);
  if (rank === null) {
    return mid;
  }
  const t = Math.min(1, Math.max(0, rank));
  return t <= 0.5 ? mixHex(low, mid, t * 2) : mixHex(mid, high, (t - 0.5) * 2);
}

export function textoLegible(fondo: string): string {
  const r = Number.parseInt(fondo.slice(1, 3), 16);
  const g = Number.parseInt(fondo.slice(3, 5), 16);
  const b = Number.parseInt(fondo.slice(5, 7), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? 'oklch(0.25 0.02 255)' : '#ffffff';
}

export function oklchToHex(color: string): string {
  const match = /oklch\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+(-?[\d.]+)\s*\)/i.exec(color);
  if (!match) {
    return color;
  }
  const lightness = Number.parseFloat(match[1]!);
  const chroma = Number.parseFloat(match[2]!);
  const hue = Number.parseFloat(match[3]!) * (Math.PI / 180);
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l_ = lightness! + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = lightness! - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = lightness! - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const channel = (value: number): number => {
    const clamped = Math.min(1, Math.max(0, value));
    const srgb =
      clamped <= 31308e-7 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255);
  };
  return (
    '#' +
    linear.map((value) => channel(value).toString(16).padStart(2, '0')).join('')
  );
}

export function mixHex(from: string, to: string, t: number): string {
  const parse = (hex: string): [number, number, number] => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const mix = (a: number, b: number): number => Math.round(a + (b - a) * t);
  return (
    '#' +
    [mix(r1, r2), mix(g1, g2), mix(b1, b2)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
  );
}
