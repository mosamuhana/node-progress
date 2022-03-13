/// <reference types="node" />
declare type CompleteFn = (bar: ProgressBar) => void;
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
export declare class ProgressBar {
    private _tokens?;
    private _lastDraw;
    private _start?;
    private _completed;
    private _format;
    private _total;
    private _current;
    private _width;
    private _throttle;
    private _stream;
    private _clear;
    private _onComplete;
    private _completeChar;
    private _incompleteChar;
    get completed(): boolean;
    get current(): number;
    get total(): number;
    set total(v: number);
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
    /**
     * Method to render the progress bar with optional `tokens` to place in the
     * progress bar's `fmt` field.
     *
     * @param {object} tokens
     * @api public
     */
    private _render;
}
export {};
//# sourceMappingURL=index.d.ts.map