import { KeyInput, PaperFormat, PDFMargin } from 'puppeteer';
export type Action =
  | NavigateAction
  | WaitForSelectorAction
  | KeyboardShortcutAction
  | TypeTextAction
  | ClickAction
  | ScrollAction
  | ScreenshotAction
  | SleepAction
  | ToPDFAction
  | SetContentAction;

export type NavigateAction = {
  type: 'navigate';
  url: string;
  options?: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
  };
};

export type SleepAction = {
  type: 'sleep';
  ms: number;
};

export type WaitForSelectorAction = {
  type: 'waitForSelector';
  selector: string;
  options?: {
    visible?: boolean;
    hidden?: boolean;
    timeout?: number;
  };
};

export type KeyboardShortcutAction = {
  type: 'keyboardShortcut';
  commands: KeyboardCommand[];
};

type KeyboardCommand = {
  action: 'down' | 'up' | 'press';
  key: KeyInput;
};

export type TypeTextAction = {
  type: 'typeText';
  selector: string;
  text: string;
  options?: {
    delay?: number;
    timeout?: number;
  };
};

export type ClickAction = {
  type: 'click';
  selector: string;
  options?: {
    delay?: number;
    timeout?: number;
  };
};

// 扩展操作类型示例
export type ScrollAction = {
  type: 'scroll';
  times: number;
  options?: {
    deltaY?: number;
    delay?: number;
  };
};

export type SetContentAction = {
  type: 'setContent';
  html: string;
};

export type ScreenshotAction = {
  type: 'screenshot';
  options?: {
    fullPage?: boolean;
    quality?: number;
  };
};

interface PDFOptions {
  /**
   * Scales the rendering of the web page. Amount must be between `0.1` and `2`.
   * @defaultValue `1`
   */
  scale?: number;
  /**
   * Whether to show the header and footer.
   * @defaultValue `false`
   */
  displayHeaderFooter?: boolean;
  /**
   * HTML template for the print header. Should be valid HTML with the following
   * classes used to inject values into them:
   *
   * - `date` formatted print date
   *
   * - `title` document title
   *
   * - `url` document location
   *
   * - `pageNumber` current page number
   *
   * - `totalPages` total pages in the document
   */
  headerTemplate?: string;
  /**
   * HTML template for the print footer. Has the same constraints and support
   * for special classes as {@link PDFOptions.headerTemplate}.
   */
  footerTemplate?: string;
  /**
   * Set to `true` to print background graphics.
   * @defaultValue `false`
   */
  printBackground?: boolean;
  /**
   * Whether to print in landscape orientation.
   * @defaultValue `false`
   */
  landscape?: boolean;
  /**
   * Paper ranges to print, e.g. `1-5, 8, 11-13`.
   * @defaultValue The empty string, which means all pages are printed.
   */
  pageRanges?: string;
  /**
   * @remarks
   * If set, this takes priority over the `width` and `height` options.
   * @defaultValue `letter`.
   */
  format?: PaperFormat;
  /**
   * Sets the width of paper. You can pass in a number or a string with a unit.
   */
  width?: string | number;
  /**
   * Sets the height of paper. You can pass in a number or a string with a unit.
   */
  height?: string | number;
  /**
   * Give any CSS `@page` size declared in the page priority over what is
   * declared in the `width` or `height` or `format` option.
   * @defaultValue `false`, which will scale the content to fit the paper size.
   */
  preferCSSPageSize?: boolean;
  /**
   * Set the PDF margins.
   * @defaultValue `undefined` no margins are set.
   */
  margin?: PDFMargin;
  /**
   * The path to save the file to.
   *
   * @remarks
   *
   * If the path is relative, it's resolved relative to the current working directory.
   *
   * @defaultValue `undefined`, which means the PDF will not be written to disk.
   */
  path?: string;
  /**
   * Hides default white background and allows generating pdfs with transparency.
   * @defaultValue `false`
   */
  omitBackground?: boolean;
  /**
   * Generate tagged (accessible) PDF.
   *
   * @defaultValue `true`
   * @experimental
   */
  tagged?: boolean;
  /**
   * Generate document outline.
   *
   * @defaultValue `false`
   * @experimental
   */
  outline?: boolean;
  /**
   * Timeout in milliseconds. Pass `0` to disable timeout.
   *
   * The default value can be changed by using {@link Page.setDefaultTimeout}
   *
   * @defaultValue `30_000`
   */
  timeout?: number;
  /**
   * If true, waits for `document.fonts.ready` to resolve. This might require
   * activating the page using {@link Page.bringToFront} if the page is in the
   * background.
   *
   * @defaultValue `true`
   */
  waitForFonts?: boolean;
}

export type ToPDFAction = {
  type: 'toPDF';
  options?: PDFOptions;
};
