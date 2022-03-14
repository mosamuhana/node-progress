import { platform } from 'os';

type CompleteFn = (bar: ProgressBar) => void;

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
   * The displayed width of the progress bar defaulting to total.
   */
  width?: number;

  /**
   * minimum time between updates in milliseconds defaulting to 16
   */
  throttle?: number;

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
  onComplete?: CompleteFn;

  /**
   * Completion character defaulting to "=".
   */
  completeChar?: string;

  /**
  * Incomplete character defaulting to "-".
  */
  incompleteChar?: string;

	/**
	 * terminal line
	*/
	line?: number;
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
 *   - `stream` the output stream defaulting to stderr
 *   - `head` head character defaulting to complete character
 *   - `complete` completion character defaulting to "="
 *   - `incomplete` incomplete character defaulting to "-"
 *   - `throttle` minimum time between updates in milliseconds defaulting to 16
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
 *   - `{rate}` rate of ticks per second
 *
 * @param {ProgressBarOptions} options
 */
export class ProgressBar {
  private _tokens?: Record<string, string>;
  private _lastDraw: string;
  private _start?: number;
  private _completed: boolean = false;

  private _format: string;
  private _total: number;
  private _current: number;
  private _width: number;
  private _throttle: number;
  private _stream: NodeJS.WriteStream;
  private _clear: boolean;
  private _onComplete: CompleteFn;
  private _completeChar: string;
  private _incompleteChar: string;
  private _line?: number;

  public get completed(): boolean { return this._completed; }
  public get current(): number { return this._current; }
  public get total(): number { return this._total; }
  public set total(v: number) {
    if (isNumber(v) && v > 0) {
      this._total = v;
    }
  }

  constructor(options?: ProgressBarOptions) {
    const {
      format, total, current, width, stream, onComplete,
      clear, throttle, completeChar, incompleteChar, line,
    } = options ?? {};

    this._format = format ?? '{bar} {percent}';
    this._total = total ?? 100;
    this._stream = stream ?? process.stderr;
    this._current = current ?? 0;
    this._width = width ?? this._total;
    this._throttle = throttle !== 0 ? throttle || 16 : 0;
    this._onComplete = onComplete ?? (() => {});
    this._completeChar = completeChar ?? C_COMPLETE;
    this._incompleteChar = incompleteChar ?? C_INCOMPLETE;
    this._clear = clear ?? false;
		if (typeof line === 'number') {
			if (line < 0) {
				throw new Error('line must be >= 0');
			}
			this._line = line;
		}

    this._tokens = {};
    this._lastDraw = '';

    if (!this._format.includes('{bar}')) this._format = '{bar} ' + this._format;
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
    this._current = current ?? 1;
    this._tokens = customTokens;

    this._render();

    // progress complete
    if (this._current >= this._total) {
      this._render();
      this._completed = true;

      if (this._clear) {
        if (this._stream.clearLine) {
          this._stream.clearLine(-1);
          this._stream.cursorTo(0, this._line);
        }
      } else {
        this._stream.write('\n');
      }

      this._onComplete(this);
    }
  }

	public interrupt(message: string) {
		this._stream.clearLine(0);
		this._stream.cursorTo(0, this._line);
		this._stream.write(message);
		this._stream.write('\n');
		// re-display the progress bar with its lastDraw
		this._stream.write(this._lastDraw);
	}

  /**
   * Method to render the progress bar with optional `tokens` to place in the
   * progress bar's `fmt` field.
   *
   * @param {object} tokens
   * @api public
   */
  private _render() {
    if (!this._stream.isTTY) return;

    // start time for eta
    const now = Date.now();
    if (!this._start) this._start = now;
    const start: number = this._start;

    const ratio = Math.min(Math.max(this._current / this._total, 0), 1);
    const percent = Math.floor(ratio * 100);
    const elapsed = now - start;
    const eta = percent == 100 ? 0 : elapsed * (this._total / this._current - 1);
    const rate = elapsed == 0 ? 0 : this._current / (elapsed / 1000);

    /* populate the bar template with percentages and timestamps */
    let output = this._format
      .replace('{current}', `${this._current}`)
      .replace('{total}', `${this._total}`)
      .replace('{elapsed}', (elapsed / 1000).toFixed(1))
      .replace('{eta}', (eta / 1000).toFixed(1))
      .replace('{percent}', percent.toFixed(1) + '%')
      .replace('{rate}', `${Math.round(rate)}`);

    /* compute the available space (non-zero) for the bar */
    let availableSpace = Math.max(0, this._stream.columns - output.replace('{bar}', '').length);
    if (IS_WINDOWS && availableSpace) {
      availableSpace = availableSpace - 1;
    }

    const width = Math.min(this._width, availableSpace);

    /* TODO: the following assumes the user has one ':bar' token */
    const completeLength = Math.round(width * ratio);
    const incomplete = repeat(Math.max(0, width - completeLength + 1), this._incompleteChar);
    let complete = repeat(Math.max(0, completeLength + 1), this._completeChar);
    /* add head to the complete string */
    if (completeLength > 0) complete = complete.slice(0, -1) + this._completeChar;

    /* fill in the actual progress bar */
    output = output.replace('{bar}', complete + incomplete);

    /* replace the extra tokens */
    if (this._tokens) {
      Object.entries(this._tokens).forEach(([key, value]) => output = output.replace(`[${key}]`, value));
    }

    if (this._lastDraw !== output) {
      this._stream.cursorTo(0, this._line);
      this._stream.write(output);
      this._stream.clearLine(1);
      this._lastDraw = output;
    }
  }
}

const repeat = (n: number, c: string) => Array(n).join(c);

// https://theasciicode.com.ar/
const C_COMPLETE = '█';
const C_INCOMPLETE = '░';

const IS_WINDOWS = platform() == 'win32';

const isNumber = (v: number): v is number => typeof v === 'number' && !isNaN(v) && isFinite(v);
