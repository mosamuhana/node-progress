/**
 * @devteks/progress
 * node ascii progress bar
 * Version: 0.0.4
 * Author: [object Object]
 * License: MIT
 * Homepage: https://github.com/mosamuhana/node-progress
 */

import { Transform, TransformCallback } from 'node:stream';

interface Progress {
    percent: number;
    current: number;
    total: number;
    remaining: number;
    eta: number;
    runtime: number;
    speed: number;
}

declare type ProgressBarCompleteListener = (bar: ProgressBar) => void;
/**
 * These are keys in the options object you can pass to the progress bar
 * along with total as seen in the example above.
 */
interface ProgressBarOptions {
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
declare class ProgressBar {
    #private;
    get completed(): boolean;
    get total(): number;
    set total(v: number);
    get progress(): Progress;
    constructor(options?: ProgressBarOptions);
    /**
     * "tick" the progress bar with optional `current` and optional custom `tokens`.
     *
     * customTokens: used in format as `[tokenName]`
     *
     * @param {number|object} current current index to tick.
     * @param {object} customTokens custom tokens to replace in the format string.
     * @api public
     */
    tick(current?: number, customTokens?: Record<string, string>): void;
    interrupt(message: string): void;
}

declare type ProgressListener = (progress: Progress) => void;
declare type TotalListener = (total: number) => void;
interface ProgressStreamOptions {
    interval?: number;
    total?: number;
    current?: number;
    onProgress?: ProgressListener;
    onTotal?: TotalListener;
}
interface ProgressStream extends Transform {
    on(event: 'progress', listener: ProgressListener): this;
    on(event: 'total', listener: TotalListener): this;
    once(event: 'progress', listener: ProgressListener): this;
    once(event: 'total', listener: TotalListener): this;
    off(event: 'progress', listener: ProgressListener): this;
    off(event: 'total', listener: TotalListener): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
}
declare class ProgressStream extends Transform {
    #private;
    get progress(): Progress;
    get total(): number;
    set total(v: number);
    constructor({ total, interval, current, onProgress, onTotal }?: ProgressStreamOptions);
    _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void;
    _flush(callback: TransformCallback): void;
}

export { Progress, ProgressBar, ProgressBarOptions, ProgressStream, ProgressStreamOptions };
