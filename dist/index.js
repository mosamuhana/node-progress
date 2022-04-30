/**
 * @devteks/progress
 * node ascii progress bar
 * Version: 0.0.4
 * Author: [object Object]
 * License: MIT
 * Homepage: https://github.com/mosamuhana/node-progress
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var os = require('os');
var node_stream = require('node:stream');

function getContentLength(source) {
    if (source && source.headers && source.headers['content-length']) {
        const n = parseInt(source.headers['content-length'], 10);
        if (isNumber(n) && n > 0) {
            return n;
        }
    }
    return undefined;
}
function round(num, precision = 0) {
    if (precision <= 0)
        return Math.round(num);
    const n = Math.pow(10, precision);
    return Math.round(num * n) / n;
}
function clamp(v, min, max) {
    if (isNumber(v)) {
        v = Math.max(v, min);
        if (isNumber(max)) {
            v = Math.min(v, max);
        }
    }
    else {
        v = min;
    }
    return v;
}
function isNumber(v) {
    return typeof v === 'number' && !isNaN(v);
}
const repeat = (n, c) => Array(n).join(c);
const getChar = (s) => typeof s === 'string' && s.length >= 1 ? s.charAt(0) : s;

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
class ProgressBar {
    #tokens;
    #lastDraw;
    #completed = false;
    #format;
    #width;
    #minWidth = MIN_WIDTH;
    #stream;
    #clear;
    #onComplete;
    #completeChar;
    #incompleteChar;
    #line;
    #formatValue;
    #interval = 0;
    #total;
    #prevTime;
    #startTime = 0;
    #endTime = 0;
    #progress;
    get completed() { return this.#completed; }
    get total() { return this.#total ?? 0; }
    set total(v) {
        if (!isNumber(v) || !isFinite(v) || v <= 0) {
            throw new Error('total value must be a finite positive number');
        }
        this.#progress.total = this.#total = v;
    }
    get progress() { return { ...this.#progress }; }
    constructor(options) {
        const { format, total, current, width, stream, onComplete, clear, interval, completeChar, incompleteChar, line, minWidth, formatValue, } = options ?? {};
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
        this.#formatValue = formatValue ?? ((value) => value.toString());
        this.#format = format ?? '{bar} {percent}';
        this.#total = total;
        this.#stream = stream ?? process.stderr;
        this.#width = width;
        this.#minWidth = clamp(minWidth, MIN_WIDTH);
        this.#interval = clamp(interval, 0);
        this.#onComplete = onComplete ?? (() => { });
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
        if (!this.#format.includes('{bar}'))
            this.#format = '{bar} ' + this.#format;
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
        if (!this.#completed)
            return;
        if (this.#clear) {
            if (this.#stream.clearLine) {
                this.#stream.clearLine(-1);
                this.#stream.cursorTo(0, this.#line);
            }
        }
        else {
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
    tick(current, customTokens) {
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
    interrupt(message) {
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
        if (!this.#stream.isTTY)
            return;
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
            if (minWidth > availableSpace)
                minWidth = availableSpace;
            const width = clamp(this.#width ?? Infinity, minWidth, availableSpace);
            const completeLength = Math.round(width * ratio);
            const incomplete = repeat(Math.max(0, width - completeLength + 1), this.#incompleteChar);
            let complete = repeat(Math.max(0, completeLength + 1), this.#completeChar);
            if (completeLength > 0)
                complete = complete.slice(0, -1) + this.#completeChar;
            output = output.replace('{bar}', complete + incomplete);
        }
        else {
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
const IS_WINDOWS = os.platform() == 'win32';
const MIN_WIDTH = 20;

class ProgressStream extends node_stream.Transform {
    #interval = 0;
    #prevTime;
    #startTime = 0;
    #endTime = 0;
    #total;
    #progress;
    #onProgress;
    #onTotal;
    get progress() { return { ...this.#progress }; }
    get total() { return this.#total ?? 0; }
    set total(v) {
        if (!isNumber(v) || !isFinite(v) || v <= 0) {
            throw new Error('total value must be a finite positive number');
        }
        this.#progress.total = this.#total = v;
        this.emit('total', v);
        if (this.#onTotal)
            this.#onTotal(v);
    }
    constructor({ total, interval, current, onProgress, onTotal } = {}) {
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
            this.on('pipe', (source) => {
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
                source.on('response', (res) => {
                    if (!res || !res.headers)
                        return;
                    if (res.headers[CONTENT_ENCODING] === 'gzip')
                        return;
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
    _transform(chunk, encoding, callback) {
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
    _flush(callback) {
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

exports.ProgressBar = ProgressBar;
exports.ProgressStream = ProgressStream;
