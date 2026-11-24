/**
 * Brand color helpers for white-label tenants.
 *
 * Guest routes only ever see `--brand-primary`. These helpers derive the
 * companion tokens (readable foreground, subtle tint) so text on an arbitrary
 * tenant color always meets contrast, without hard-coding any brand color.
 */

export const DEFAULT_BRAND_PRIMARY = '#EA580C';

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Returns the color unchanged when it is a valid #RGB / #RRGGBB hex, else the default. */
export function sanitizeBrandColor(value: string | null | undefined): string {
    const trimmed = (value ?? '').trim();
    return HEX_RE.test(trimmed) ? trimmed : DEFAULT_BRAND_PRIMARY;
}

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.slice(1);
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelLuminance(channel: number): number {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex);
    return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(a: number, b: number): number {
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
}

const ON_BRAND_LIGHT = '#FFFFFF';
const ON_BRAND_DARK = '#1C1917';

/**
 * Picks white or warm near-black, whichever has the higher contrast on the brand color.
 * For the default saffron (#EA580C) that is dark text (about 5:1; white would be 3.6:1).
 */
export function getReadableForeground(brandHex: string): string {
    const lum = relativeLuminance(sanitizeBrandColor(brandHex));
    const withLight = contrastRatio(1, lum);
    const withDark = contrastRatio(lum, relativeLuminance(ON_BRAND_DARK));
    return withLight >= withDark ? ON_BRAND_LIGHT : ON_BRAND_DARK;
}

/** CSS custom properties injected on the tenant wrapper. */
export function getBrandCssVars(primaryColor: string | null | undefined): Record<string, string> {
    const primary = sanitizeBrandColor(primaryColor);
    return {
        '--brand-primary': primary,
        '--brand-primary-foreground': getReadableForeground(primary),
        '--brand-primary-subtle': `color-mix(in srgb, ${primary} 8%, transparent)`,
    };
}
