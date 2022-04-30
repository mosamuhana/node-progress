import { Transform, TransformCallback } from 'node:stream';

import { getContentLength, round, isNumber } from './utils';
import { Progress } from './types';

type ProgressListener = (progress: Progress) => void;
type TotalListener = (total: number) => void;

export interface ProgressStreamOptions {
	interval?: number;
	total?: number;
	current?: number;
	onProgress?: ProgressListener;
	onTotal?: TotalListener;
}

export interface ProgressStream extends Transform {
	on(event: 'progress', listener: ProgressListener): this;
	on(event: 'total', listener: TotalListener): this;
	once(event: 'progress', listener: ProgressListener): this;
	once(event: 'total', listener: TotalListener): this;
	off(event: 'progress', listener: ProgressListener): this;
	off(event: 'total', listener: TotalListener): this;

	on(event: string | symbol, listener: (...args: any[]) => void): this;
	once(event: string | symbol, listener: (...args: any[]) => void): this;
}

export class ProgressStream extends Transform {
	#interval: number = 0;
	#prevTime?: number;
	#startTime: number = 0;
	#endTime: number = 0;

	#total?: number;
	#progress: Progress;
	#onProgress?: ProgressListener;
	#onTotal?: TotalListener;

	get progress(): Progress { return { ...this.#progress }; }

	public get total(): number { return this.#total ?? 0; }

  public set total(v: number) {
		if (!isNumber(v) || !isFinite(v) || v <= 0) {
			throw new Error('total value must be a finite positive number');
		}
		this.#progress.total = this.#total = v;
		this.emit('total', v);
		if (this.#onTotal) this.#onTotal(v);
  }

	constructor({ total, interval, current, onProgress, onTotal }: ProgressStreamOptions = {}) {
		super();

		if (interval != null && (!isNumber(interval) || !isFinite(interval) || interval < 0)) {
			throw new TypeError('interval must be a number >= 0');
		}

		if (total != null && (!isNumber(total) || !isFinite(total) || total <= 0)) {
			throw new TypeError('total must be a number > 0');
		}

		this.#interval = interval || 0;
		this.#total = total;
		this.#onProgress = onProgress;
		this.#onTotal = onTotal;

		this.#progress = {
			percent: 0,
			current: current ?? 0,
			total: total ?? 0,
			remaining: total ?? 0,
			eta: 0,
			runtime: 0,
			speed: 0,
		};

		if (total == null) {
			this.on('pipe', (source: any) => {
				if (source.readable && !source.writable && source.headers) {
					let len = getContentLength(source);
					if (len) {
						this.total = len;
						return;
					}
				}

				if (typeof source.length === 'number') {
					this.total = source.length;
					return;
				}

				source.on('response', (res: any) => {
					if (!res || !res.headers) return;
					if (res.headers[CONTENT_ENCODING] === 'gzip') return;
					const len = getContentLength(res.headers);
					if (len) {
						this.total = len;
					}
				});
			});
		}
	}

	#update() {
		const [current, total] = [this.#progress.current, this.#total];
		let runtime = (this.#endTime - this.#startTime) / 1000;
		this.#progress.runtime = round(runtime, 3);
		let speed = 0;
		if (typeof total === 'number') {
			this.#progress.percent = round(current / total * 100, 3);
			let remaining = total - current;
			this.#progress.remaining = remaining;
			if (runtime > 0) {
				speed = current / runtime;
				this.#progress.speed = round(speed, 3);
				this.#progress.eta = round(remaining / speed, 3);
			}
		}
	}

	#emit() {
		if (this.#onProgress) {
			this.#onProgress(this.progress);
		}
		this.emit('progress', this.progress);
	}

	_transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
		this.push(chunk, encoding);
		callback();
		this.#progress.current += chunk.length;

		const now = Date.now();
		this.#endTime = now;
		if (this.#prevTime === undefined) {
			this.#startTime = this.#prevTime = now;
		}

		this.#update();

		const diff = now - this.#prevTime;
		if (diff >= this.#interval) {
			this.#prevTime = now;
			this.#emit();
		}
	}

	_flush(callback: TransformCallback): void {
		this.#endTime = Date.now();
		this.push(null);
		callback();
		if (this.#interval > 0) {
			this.total = this.#progress.current;
			this.#update();
			this.#emit();
		}
	}
}

const CONTENT_ENCODING = 'content-encoding';
