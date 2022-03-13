"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressBar = void 0;
const os_1 = require("os");
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
class ProgressBar {
    constructor(options) {
        this._completed = false;
        const { format, total, current, width, stream, onComplete, clear, throttle, completeChar, incompleteChar, } = options !== null && options !== void 0 ? options : {};
        this._format = format !== null && format !== void 0 ? format : '{bar} {percent}';
        this._total = total !== null && total !== void 0 ? total : 100;
        this._stream = stream !== null && stream !== void 0 ? stream : process.stderr;
        this._current = current !== null && current !== void 0 ? current : 0;
        this._width = width !== null && width !== void 0 ? width : this._total;
        this._throttle = throttle !== 0 ? throttle || 16 : 0;
        this._onComplete = onComplete !== null && onComplete !== void 0 ? onComplete : (() => { });
        this._completeChar = completeChar !== null && completeChar !== void 0 ? completeChar : C_COMPLETE;
        this._incompleteChar = incompleteChar !== null && incompleteChar !== void 0 ? incompleteChar : C_INCOMPLETE;
        this._clear = clear !== null && clear !== void 0 ? clear : false;
        this._tokens = {};
        this._lastDraw = '';
        if (!this._format.includes('{bar}'))
            this._format = '{bar} ' + this._format;
    }
    get completed() { return this._completed; }
    get current() { return this._current; }
    get total() { return this._total; }
    set total(v) {
        if (isNumber(v) && v > 0) {
            this._total = v;
        }
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
    tick(current, customTokens) {
        this._current = current !== null && current !== void 0 ? current : 1;
        this._tokens = customTokens;
        this._render();
        // progress complete
        if (this._current >= this._total) {
            this._render();
            this._completed = true;
            if (this._clear) {
                if (this._stream.clearLine) {
                    this._stream.clearLine(-1);
                    this._stream.cursorTo(0);
                }
            }
            else {
                this._stream.write('\n');
            }
            this._onComplete(this);
        }
    }
    interrupt(message) {
        this._stream.clearLine(0);
        this._stream.cursorTo(0);
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
    _render() {
        if (!this._stream.isTTY)
            return;
        // start time for eta
        const now = Date.now();
        if (!this._start)
            this._start = now;
        const start = this._start;
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
        if (completeLength > 0)
            complete = complete.slice(0, -1) + this._completeChar;
        /* fill in the actual progress bar */
        output = output.replace('{bar}', complete + incomplete);
        /* replace the extra tokens */
        if (this._tokens) {
            Object.entries(this._tokens).forEach(([key, value]) => output = output.replace(`[${key}]`, value));
        }
        if (this._lastDraw !== output) {
            this._stream.cursorTo(0);
            this._stream.write(output);
            this._stream.clearLine(1);
            this._lastDraw = output;
        }
    }
}
exports.ProgressBar = ProgressBar;
const repeat = (n, c) => Array(n).join(c);
// https://theasciicode.com.ar/
const C_COMPLETE = '█';
const C_INCOMPLETE = '░';
const IS_WINDOWS = (0, os_1.platform)() == 'win32';
const isNumber = (v) => typeof v === 'number' && !isNaN(v) && isFinite(v);
