const UNITS = ['B', 'kB', 'MB', 'GB', 'TB'];
const KB = 1024;

export function fmtSize(v: number, precision: number = 1) {
	if (v === 0) return '0 B';
	const p = Math.floor(Math.log(v) / Math.log(KB));
	const n = (v / Math.pow(KB, Math.floor(p))).toFixed(precision);
	const u = UNITS[p];
	return `${n} ${u}`;
}

export function getContentLength(source: any): number | undefined {
	if (source && source.headers && source.headers['content-length']) {
		const n = parseInt(source.headers['content-length'], 10);
		if (isNumber(n) && n > 0) {
			return n;
		}
	}
	return undefined;
}

export function round(num: number, precision: number = 0) {
	if (precision <= 0) return Math.round(num);
	const n = Math.pow(10, precision);
	return Math.round(num * n) / n;
}

export function clamp(v: any, min: number, max?: number): number {
	if (isNumber(v)) {
		v = Math.max(v, min);
		if (isNumber(max)) {
			v = Math.min(v, max);
		}
	} else {
		v = min;
	}
	return v;
}

export function isNumber(v: any): v is number {
	return typeof v === 'number' && !isNaN(v);
}

export const repeat = (n: number, c: string) => Array(n).join(c);
export const getChar = (s: any) => typeof s === 'string' && s.length >= 1 ? s.charAt(0) : s;
