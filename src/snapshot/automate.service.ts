import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import {
  Action,
  ClickAction,
  KeyboardShortcutAction,
  NavigateAction,
  ScreenshotAction,
  ScrollAction,
  SetContentAction,
  ToPDFAction,
  TypeTextAction,
  WaitForSelectorAction,
} from './dto/automate.request.dto';
import { sleep } from './../core/utils';

@Injectable()
export class BrowserAutomation {
  private readonly logger = new Logger(BrowserAutomation.name);
  async execute(page: Page, actions: Action[]) {
    const result = {
      success: true,
      steps: [],
      error: null,
    };

    for (const [index, action] of actions.entries()) {
      const stepResult = {
        index,
        type: action.type,
        success: true,
        error: null,
        result: null,
      };

      try {
        stepResult.result = await this.handleAction(page, action);
      } catch (error) {
        stepResult.success = false;
        stepResult.error = error.message;
        result.success = false;
        result.error = `Failed at step ${index} (${action.type})`;
        break;
      } finally {
        result.steps.push(stepResult);
      }
    }

    return result;
  }

  async handleAction(page: Page, action: Action) {
    switch (action.type) {
      case 'navigate':
        return this.handleNavigate(page, action);
      case 'waitForSelector':
        return this.handleWaitForSelector(page, action);
      case 'keyboardShortcut':
        return this.handleKeyboardShortcut(page, action);
      case 'typeText':
        return this.handleTypeText(page, action);
      case 'click':
        return this.handleClick(page, action);
      case 'sleep':
        return this.handleSleep(action.ms);
      case 'setContent':
        return this.handleSetContent(page, action);
      case 'scroll':
        return this.handleScroll(page, action);
      case 'toPDF':
        return this.handleToPDF(page, action);
      case 'screenshot':
        return this.handleScreenshot(page, action);
      default:
        throw new Error(`Unsupported action type: ${action['type']}`);
    }
  }

  async handleSleep(ms: number) {
    await sleep(ms);
  }

  async handleNavigate(page: Page, action: NavigateAction) {
    await page.goto(action.url, {
      waitUntil: action.options?.waitUntil || 'load',
      timeout: action.options?.timeout || 30000,
    });
  }

  async handleWaitForSelector(page: Page, action: WaitForSelectorAction) {
    await page.waitForSelector(action.selector, {
      visible: action.options?.visible || true,
      timeout: action.options?.timeout || 30000,
    });
  }

  async handleKeyboardShortcut(page: Page, action: KeyboardShortcutAction) {
    for (const command of action.commands) {
      switch (command.action) {
        case 'down':
          await page.keyboard.down(command.key);
          break;
        case 'up':
          await page.keyboard.up(command.key);
          break;
        case 'press':
          await page.keyboard.press(command.key);
          break;
        default:
          throw new Error(`Invalid keyboard action: ${command.action}`);
      }
    }
  }

  async handleTypeText(page: Page, action: TypeTextAction) {
    await page.waitForSelector(action.selector, {
      visible: true,
      timeout: action.options?.timeout || 5000,
    });

    await page.type(action.selector, action.text, {
      delay: action.options?.delay || 100,
    });
  }

  async handleClick(page: Page, action: ClickAction) {
    await page.waitForSelector(action.selector, {
      visible: true,
      timeout: action.options?.timeout || 5000,
    });

    await page.click(action.selector, {
      delay: action.options?.delay || 100,
    });
  }

  async handleScroll(page: Page, action: ScrollAction) {
    const scrollTimes = action.times ?? 20;
    const scrollDelay = action?.options?.delay ?? 1000;
    const scrollOffset = parseInt(action?.options?.deltaY?.toString()) ?? 1000;
    // 获取初始页面高度
    let previousHeight = await page.evaluate(() =>
      Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
      ),
    );
    let scrollCount = 0;
    let heightChanged = true;
    while (scrollCount < scrollTimes && heightChanged) {
      // 执行滚动
      await page.mouse.wheel({ deltaY: scrollOffset });

      await sleep(scrollDelay);
      // 获取新的页面高度
      const currentHeight = await page.evaluate(() =>
        Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight,
        ),
      );

      // 检查高度是否变化
      if (currentHeight === previousHeight) {
        heightChanged = false;
      } else {
        previousHeight = currentHeight;
        scrollCount++;
      }
    }
  }

  async handleSetContent(page: Page, action: SetContentAction) {
    await page.setContent(action.html, {
      waitUntil: 'load',
    });
  }

  /**
   * 截图
   * @param page
   * @param action
   * @returns - Promise<string> - jpeg图片的base64
   */
  async handleScreenshot(
    page: Page,
    action: ScreenshotAction,
  ): Promise<string> {
    const screenshot = await page.screenshot({
      fullPage: action.options?.fullPage || false,
      quality: action.options?.quality || 100,
      type: 'jpeg', // 可选 jpeg png
      omitBackground: false, // 是否忽略背景，如果忽略背景则会截一个透明的图
      encoding: 'binary',
      /**
       * captureBeyondViewport <boolean> When true, captures screenshot beyond the viewport.
       * Whe false, falls back to old behaviour, and cuts the screenshot by the viewport size.
       * Defaults to true.
       */
      captureBeyondViewport: true,
    });

    return (
      'data:image/jpeg;base64,' + Buffer.from(screenshot).toString('base64')
    );
  }

  async handleToPDF(page: Page, action: ToPDFAction): Promise<string> {
    const pdfBuffer = await page.pdf({
      format: action.options?.format || 'A4',
      ...action.options,
    });

    return Buffer.from(pdfBuffer).toString('base64');
  }
}
