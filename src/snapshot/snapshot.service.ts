import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Scope,
} from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import { CaptureTrafficOptionDto } from './dto/snapshot.request.dto';
import { v4 as uuidv4 } from 'uuid';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page, KnownDevices, PDFOptions } from 'puppeteer';
import { sleep } from './../core/utils';
import { BrowserAutomation } from './automate.service';

puppeteer.use(StealthPlugin());
/**
 * 常用分辨率
 * https://gs.statcounter.com/screen-resolution-stats/desktop/worldwide
 * https://gs.statcounter.com/screen-resolution-stats/tablet/worldwide
 * https://gs.statcounter.com/screen-resolution-stats/mobile/worldwide
 *
 * 页面截图的选项
 * https://pptr.dev/#?product=Puppeteer&version=v5.3.1&show=api-pagescreenshotoptions
 */

@Injectable({ scope: Scope.REQUEST })
export class SnapshotService {
  /**
   * 浏览器实例
   */
  private browser: Browser;

  /**
   * 页面实例
   */
  private page: Page;

  private isRunning = false;

  private readonly logger = new Logger(SnapshotService.name);

  constructor(private readonly automateService: BrowserAutomation) {}

  async init(options: { debug?: boolean; proxy?: string } = { debug: false }) {
    if (!this.browser && this.isRunning === false) {
      this.isRunning = true;

      /**
       * 语言设置
       * https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
       * TODO: --lang设了也没用 可以测试 https://mp.weixin.qq.com/s/-mdhLUQ1EYMGrsOjsgsOzQ
       */
      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        /**
         * https://stackoverflow.com/questions/48297515/puppeteer-chromium-handle-crashing-memory-heavy-pages
         * https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#tips
         * This will write shared memory files into /tmp instead of /dev/shm. See crbug.com/736452 for more details.
         */
        '--disable-dev-shm-usage',
        '--lang=zh',
        '--single-process',
        '--no-zygote',
        // 字体加载问题 https://github.com/Zijue/blog/issues/44
        '--font-render-hinting=none',
      ];

      if (options.proxy) {
        args.push(`--proxy-server=${options.proxy}`);
      }

      this.browser = await puppeteer.launch({
        headless: !options.debug,
        devtools: options.debug,
        args,
        defaultViewport: null,
        // executablePath: path.join(__dirname, './../../chrome-linux/chrome'),
      });

      this.logger.debug(`init - new browser`);
    }
    // const browserWSEndpoint = this.browser.wsEndpoint()
    // this.logger.debug(`init - browserWSEndpoint: ${browserWSEndpoint}`)
  }

  async dryRun() {
    await this.init();
    return {
      isRunning: this.isRunning,
    };
  }

  public async setupContext(options: {
    proxy?: string;
    debug?: boolean;
    device?: string;
    resolution?: string;
  }): Promise<{ requestId: string; contextId: string }> {
    const requestId = uuidv4();

    if ('debug' in options) {
      options.debug = options.debug.toString() === 'true';
    } else {
      options.debug = false;
    }

    await this.init({ debug: options.debug, proxy: options.proxy });

    this.page = (await this.browser.pages())[0];

    // 页面参数初始化
    if (options.device) {
      /**
       * 支持的设备列表：
       * https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts
       */
      const device = KnownDevices[options.device];
      await this.page.emulate(device);
      this.logger.verbose(
        `taskeSnapshot - screenshot: ${requestId} - emulateDevice: ${device.name}`,
      );
    } else if (options.resolution) {
      const [viewPortWidth, viewPortHeight] = options.resolution.split('x');
      await this.page.setViewport({
        width: parseInt(viewPortWidth),
        height: parseInt(viewPortHeight),
      });
      this.logger.verbose(
        `taskeSnapshot - screenshot: ${requestId} - setViewPort size: ${viewPortWidth}*${viewPortHeight}`,
      );
    }

    return { requestId, contextId: requestId };
  }

  async captureTraffic(options: CaptureTrafficOptionDto) {
    try {
      let actionResult: any;
      let outputs: any;

      const { requestId } = await this.setupContext({
        debug: options.debug,
        device: options.device,
        resolution: options.resolution,
        proxy: options.proxy,
      });

      const networkTraffics: Record<
        string,
        {
          status: 'pending' | 'completed';
          requestMethod?: string;
          responseBody?: any;
          contentType?: string;
          requestHeaders?: Record<string, string>;
        }
      > = {};

      await this.page.setRequestInterception(true);

      /**
       * 注册请求的监听
       */
      this.page.on('request', (request) => {
        const requestResourceType = request.resourceType();
        this.logger.verbose(
          `captureTraffic - onRequest - requestId: ${requestId} resourceType: ${request.resourceType()} requestUrl: ${request.url().substring(0, 30)}`,
        );

        if (
          requestResourceType !== 'document' &&
          requestResourceType !== 'stylesheet' &&
          requestResourceType !== 'script' &&
          requestResourceType !== 'image' &&
          requestResourceType !== 'xhr'
        ) {
          request.continue();
          return;
        }

        if (options.trafficFilter?.include) {
          let isInclude = false;
          for (const includeRequest of options.trafficFilter.include) {
            if (new RegExp(includeRequest).test(request.url())) {
              isInclude = true;
            }
          }

          if (!isInclude) {
            request.continue();
            return;
          }
        }

        if (!(request.url() in networkTraffics)) {
          networkTraffics[request.url()] = {
            status: 'pending',
          };
        }

        request.continue();
        return;
      });

      this.page.on('response', async (response) => {
        const requestUrl = response.request().url();

        const request = response.request();
        const requestHeaders = request.headers();
        const requestMethod = request.method();
        const requestResourceType = request.resourceType();
        const requestPostData = request.postData();
        const responseHeaders = response.headers();
        const contentType = responseHeaders['content-type'];
        const responseFromCache = response.fromCache();

        this.logger.verbose(
          `captureTraffic - onResponse - requestId: ${requestId} method: ${requestMethod} url: ${requestUrl.substring(0, 30)} resourceType: ${requestResourceType}`,
        );

        if (
          responseFromCache ||
          /^blob:/.test(requestUrl) ||
          requestMethod.toUpperCase() === 'OPTIONS'
        ) {
          // Cache里有的以及本地创建的资源不下载保存, 以及option请求不保存
          return;
        }

        let responseBody: any;

        try {
          if (contentType === 'application/json') {
            responseBody = await response.json();
          } else if (/^text/.test(contentType)) {
            responseBody = await response.text();
          } else {
            responseBody = (await response.buffer()).toString('base64');
          }
        } catch (e) {
          this.logger.error(
            `captureTraffic - onResponse - requestId: requestId: ${requestId} method: ${requestMethod} url: ${requestUrl} resourceType: ${requestResourceType} - error: ${e.message}`,
          );
          responseBody = undefined;
        }

        if (requestUrl in networkTraffics) {
          networkTraffics[requestUrl].status = 'completed';
          networkTraffics[requestUrl].responseBody = responseBody;
          networkTraffics[requestUrl].contentType = contentType;
          networkTraffics[requestUrl].requestMethod = requestMethod;
          networkTraffics[requestUrl].requestHeaders = requestHeaders;
        }
      });

      try {
        actionResult = await this.automateService.execute(
          this.page,
          options.preActions,
        );
      } catch (e) {
        console.log(e);
      }

      try {
        outputs = await this.automateService.execute(
          this.page,
          options.outputActions,
        );
      } catch (e) {
        console.log(e);
      }

      return {
        networkTraffics,
        actionResult,
        outputs,
      };
    } catch (e) {
      console.log(e);
      throw new HttpException(
        '系统错误：未能生成网络快照',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      if (!options.debug && this.browser && this.browser.connected) {
        const pages = await this.browser.pages();
        for (const page of pages) {
          await page.close();
        }
        await this.browser.close();
        this.logger.debug(`takeSnapshot - close browser`);
      }
    }
  }
}
