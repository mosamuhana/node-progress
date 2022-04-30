import { platform } from 'os';

import { Progress } from "./types";
import { clamp, round, isNumber, repeat, getChar } from "./utils";

type ProgressBarCompleteListener = (bar: ProgressBar) => void;

/**
 * These are keys in the options object you can pass to the progress bar
 * along with total as seen in the example above.
 */
export interface ProgressBarOptions {
  /**
   * Format of progress with tokens
  */
  format?: string;

  /**
   * Total number of ticks to complete.
   */
  total?: number;

  /**
   * current completed index
   */
  current?: number;

  /**
   * The displayed width of the progress bar.
   */
  width?: number;

  /**
   * The minimum displayed width of the progress bar.
   */
  minWidth?: number;

  /**
   * minimum time between updates in milliseconds defaulting to 16
   */
	interval?: number;

  /**
   * The output stream defaulting to stderr.
   */
  stream?: NodeJS.WriteStream;

  /**
   * Option to clear the bar on completion defaulting to false.
   */
  clear?: boolean;

  /**
   * Optional function to call when the progress bar completes.
   */
  onComplete?: ProgressBarCompleteListener;

  /**
   * Completion character defaulting to "█".
   */
  completeChar?: string;

  /**
  * Incomplete character defaulting to "░".
  */
  incompleteChar?: string;

	/**
	 * terminal line
	*/
	line?: number;

	/**
	 * format current, total and speed values
	*/
	formatValue?: (value: number) => string;
}

/**
 * Initialize a `ProgressBar` with `options`.
 *
 * Options:
 *
 *   - `format` format of progress with tokens
 *   - `current` current completed index
 *   - `total` total number of ticks to complete
 *   - `width` the displayed width of the progress bar defaulting to total
 *   - `minWidth` The minimum displayed width of the progress bar.
 *   - `stream` the output stream defaulting to stderr
 *   - `head` head character defaulting to complete character
 *   - `complete` completion character defaulting to "="
 *   - `incomplete` incomplete character defaulting to "-"
 *   - `interval` minimum time between updates in milliseconds defaulting to 16
 *   - `onComplete` optional function to call when the progress bar completes
 *   - `clear` will clear the progress bar upon termination
 *
 * Tokens: builtin tokens
 *
 *   - `{bar}` the progress bar itself
 *   - `{current}` current tick number
 *   - `{total}` total ticks
 *   - `{elapsed}` time elapsed in seconds
 *   - `{percent}` completion percentage
 *   - `{eta}` eta in seconds
 *   - `{speed}` speed of ticks per second
 *
 * @param {ProgressBarOptions} options
 */
export class ProgressBar {
  #tokens?: Record<string, string>;
  #lastDraw: string;
  #completed: boolean = false;

  #format: string;
  #width?: number;
  #minWidth: number = MIN_WIDTH;
  #stream: NodeJS.WriteStream;
  #clear: boolean;
  #onComplete: ProgressBarCompleteListener;
  #completeChar: string;
  #incompleteChar: string;
  #line?: number;
  #formatValue: (value: number) => string;

	#interval: number = 0;
  #total?: number;
	#prevTime?: number;
	#startTime: number = 0;
	#endTime: number = 0;
	#progress: Progress;

	public get completed(): boolean { return this.#completed; }

  public get total(): number { return this.#total ?? 0; }

  public set total(v: number) {
		if (!isNumber(v) || !isFinite(v) || v <= 0) {
			throw new Error('total value must be a finite positive number');
		}
		this.#progress.total = this.#total = v;
  }

	public get progress(): Progress { return {...this.#progress}; }

  constructor(options?: ProgressBarOptions) {
    const {
      format, total, current, width, stream, onComplete,
      clear, interval, completeChar, incompleteChar, line,
			minWidth, formatValue,
    } = options ?? {};

		if (interval != null && (!isNumber(interval) || !isFinite(interval) || interval < 0)) {
			throw new TypeError('interval must be a number >= 0');
		}

		if (total != null && (!isNumber(total) || !isFinite(total) || total <= 0)) {
			throw new TypeError('total must be a number > 0');
		}

		this.#progress = {
			percent: 0,
			current: current ?? 0,
			total: total ?? 0,
			remaining: 0,
			eta: 0,
			runtime: 0,
			speed: 0,
		};

    this.#formatValue = formatValue ?? ((value: number) => value.toString());
    this.#format = format ?? '{bar} {percent}';
    this.#total = total;
    this.#stream = stream ?? process.stderr;
    this.#width = width;
		this.#minWidth = clamp(minWidth, MIN_WIDTH);
    this.#interval = clamp(interval, 0);
    this.#onComplete = onComplete ?? (() => {});
    this.#completeChar = getChar(completeChar) ?? C_COMPLETE;
    this.#incompleteChar = getChar(incompleteChar) ?? C_INCOMPLETE;
    this.#clear = clear ?? false;
		if (typeof line === 'number') {
			if (line < 0) {
				throw new Error('line must be >= 0');
			}
			this.#line = line;
		}

    this.#tokens = {};
    this.#lastDraw = '';

    if (!this.#format.includes('{bar}')) this.#format = '{bar} ' + this.#format;
  }

	#update() {
		const [current, total] = [this.#progress.current, this.#total];
		let runtime = (this.#endTime - this.#startTime) / 1000;
		this.#progress.runtime = round(runtime, 3);
		if (typeof total === 'number') {
			this.#progress.percent = round(current / total * 100, 3);
			let remaining = total - current;
			this.#progress.remaining = remaining;
			if (runtime > 0) {
				const speed = current / runtime;
				this.#progress.speed = round(speed, 3);
				this.#progress.eta = round(remaining / speed, 3);
			}
		}

		if (current >= this.#progress.total) {
			this.#completed = true;
		}
	}

	#complete() {
		if (!this.#completed) return;
		if (this.#clear) {
			if (this.#stream.clearLine) {
				this.#stream.clearLine(-1);
				this.#stream.cursorTo(0, this.#line);
			}
		} else {
			this.#stream.write('\n');
		}
		this.#onComplete(this);
	}

  /**
   * "tick" the progress bar with optional `current` and optional custom `tokens`.
   *
   * customTokens: used in format as `[tokenName]`
   *
   * @param {number|object} current current index to tick.
   * @param {object} customTokens custom tokens to replace in the format string.
   * @api public
   */
  public tick(current?: number, customTokens?: Record<string, string>) {
		this.#progress.current = current ?? 1;
    this.#tokens = customTokens;

		const now = Date.now();
		this.#endTime = now;
		if (this.#prevTime === undefined) {
			this.#startTime = this.#prevTime = now;
		}

		this.#update();

		const diff = now - this.#prevTime;
		if (diff >= this.#interval) {
			this.#prevTime = now;
			this.#render();
			this.#complete();
		}
  }

	public interrupt(message: string) {
		this.#stream.clearLine(0);
		this.#stream.cursorTo(0, this.#line);
		this.#stream.write(message);
		this.#stream.write('\n');
		// re-display the progress bar with its lastDraw
		this.#stream.write(this.#lastDraw);
	}

  /**
   * Method to render the progress bar with optional `tokens` to place in the
   * progress bar's `fmt` field.
   *
   * @param {object} tokens
   * @api public
   */
  #render() {
    if (!this.#stream.isTTY) return;

		const { percent, current, total, runtime, eta, speed } = this.#progress;

    let output = this.#format
      .replace('{current}', this.#formatValue(current))
      .replace('{total}', this.#formatValue(total))
      .replace('{elapsed}', runtime.toFixed(1))
      .replace('{eta}', (eta / 1000).toFixed(1))
      .replace('{percent}', percent.toFixed(1) + '%')
      .replace('{speed}', this.#formatValue(round(speed, 2)));

    if (this.#tokens) {
      Object.entries(this.#tokens).forEach(([key, value]) => output = output.replace(`[${key}]`, value));
    }

		const columns = this.#stream.columns;
		const nonbarContent = output.replace('{bar}', '');

		if (columns > nonbarContent.length) {
			let availableSpace = Math.max(0, columns - nonbarContent.length);
			if (IS_WINDOWS && availableSpace >= 1) {
				availableSpace -= 1;
			}

			const ratio = total === 0 ? 0 : current / total;
			let minWidth = this.#minWidth;
			if (minWidth > availableSpace) minWidth = availableSpace;
			const width = clamp(this.#width ?? Infinity, minWidth, availableSpace);

			const completeLength = Math.round(width * ratio);
			const incomplete = repeat(Math.max(0, width - completeLength + 1), this.#incompleteChar);
			let complete = repeat(Math.max(0, completeLength + 1), this.#completeChar);
			if (completeLength > 0) complete = complete.slice(0, -1) + this.#completeChar;
			output = output.replace('{bar}', complete + incomplete);
		} else {
			output = columns == nonbarContent.length ? nonbarContent : nonbarContent.substring(0, columns - 1);
		}

    if (this.#lastDraw !== output) {
      this.#stream.cursorTo(0, this.#line);
      this.#stream.write(output);
      this.#stream.clearLine(1);
      this.#lastDraw = output;
    }
  }
}

// https://theasciicode.com.ar/
const C_COMPLETE = '█'; // ▌
const C_INCOMPLETE = '░';
const IS_WINDOWS = platform() == 'win32';
const MIN_WIDTH = 20;
