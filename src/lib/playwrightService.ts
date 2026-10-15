import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page, LaunchOptions } from 'playwright';
import { validateUrlSafety } from './qaAgent';

export interface BrowserInspectionResult {
  success: boolean;
  url: string;
  requestedUrl: string;
  actualBrowserUrl: string;
  isBuiltInDemo: boolean;
  title: string;
  status: number | null;
  loadTimeMs: number;
  domSummary: {
    buttonsCount: number;
    inputsCount: number;
    linksCount: number;
    headingsCount: number;
    sampleElements: string[];
  };
  screenshotBase64?: string;
  logs: string[];
  error?: string;
}

export interface LaunchBrowserOptions {
  headless?: boolean;
  slowMo?: number;
  timeoutMs?: number;
}

/**
 * PlaywrightBrowserManager
 * Phase 1 Foundation Service: launches real Chromium, creates isolated contexts,
 * navigates to target applications, captures DOM telemetry and real screenshots,
 * and cleanly disposes of resources.
 */
export class PlaywrightBrowserManager {
  private static instance: PlaywrightBrowserManager | null = null;
  private browser: Browser | null = null;

  private constructor() {}

  public static getInstance(): PlaywrightBrowserManager {
    if (!PlaywrightBrowserManager.instance) {
      PlaywrightBrowserManager.instance = new PlaywrightBrowserManager();
    }
    return PlaywrightBrowserManager.instance;
  }

  /**
   * Launch or return existing shared Chromium browser instance
   */
  public async getBrowser(options: LaunchBrowserOptions = {}): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    console.log('[BROWSER] Launching Chromium');
    const launchOptions: LaunchOptions = {
      headless: options.headless ?? true,
      slowMo: options.slowMo ?? 0,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };

    this.browser = await chromium.launch(launchOptions);
    return this.browser;
  }

  /**
   * Creates an isolated context and page with standard desktop viewport
   */
  public async createPage(options: LaunchBrowserOptions = {}): Promise<{ context: BrowserContext; page: Page }> {
    const browser = await this.getBrowser(options);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ApexQA-Playwright/1.0'
    });
    const page = await context.newPage();
    return { context, page };
  }

  /**
   * Performs a clean, verified inspection test of a given URL.
   * Discovers real DOM elements, captures real screenshots, and records diagnostic logs.
   */
  public async inspectUrl(
    targetUrl: string, 
    options: { captureScreenshot?: boolean; timeoutMs?: number } = {}
  ): Promise<BrowserInspectionResult> {
    const logs: string[] = [];
    const log = (msg: string) => {
      console.log(msg);
      logs.push(msg);
    };

    const startTime = Date.now();
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    const isLocal = targetUrl.trim().startsWith('http://localhost:3000') || targetUrl.trim().startsWith('http://127.0.0.1:3000');

    try {
      log(`[BROWSER] Launching Chromium`);
      const setup = await this.createPage();
      context = setup.context;
      page = setup.page;

      // Real-time SSRF and route protection
      await page.route('**', async (route) => {
        const reqUrl = route.request().url();
        const urlCheck = validateUrlSafety(reqUrl, isLocal);
        if (!urlCheck.safe) {
          log(`[SECURITY] Blocked network request to unsafe destination: ${reqUrl} (${urlCheck.reason})`);
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });

      log(`[BROWSER] Navigating to ${targetUrl}`);
      const response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeoutMs ?? 15000
      });

      const httpStatus = response ? response.status() : null;
      log(`[BROWSER] Page loaded`);

      const actualUrl = page.url();
      const redirectSafety = validateUrlSafety(actualUrl, isLocal);
      if (!redirectSafety.safe) {
        throw new Error(`Navigation redirected to unsafe destination: ${actualUrl} (${redirectSafety.reason})`);
      }

      const title = await page.title();
      log(`[BROWSER] URL: ${actualUrl}`);
      log(`[BROWSER] Title: ${title}`);

      // Allow SPA hydration if root container exists
      try {
        await page.waitForSelector('#root, main, body', { timeout: 3000 });
      } catch {
        // Continue even if specific selector wait times out
      }

      // Discover real DOM interactive elements
      const buttonsCount = await page.locator('button').count();
      const inputsCount = await page.locator('input').count();
      const linksCount = await page.locator('a').count();
      const headingsCount = await page.locator('h1, h2, h3').count();

      // Collect sample element descriptors
      const sampleButtons = await page.locator('button').evaluateAll(btns => 
        btns.slice(0, 5).map(b => (b.textContent || '').trim().slice(0, 30) || (b as HTMLButtonElement).id || 'button')
      );
      const sampleInputs = await page.locator('input').evaluateAll(inputs => 
        inputs.slice(0, 5).map(i => (i as HTMLInputElement).placeholder || (i as HTMLInputElement).name || (i as HTMLInputElement).type)
      );

      log(`[BROWSER] DOM elements discovered: buttons=${buttonsCount}, inputs=${inputsCount}, links=${linksCount}`);

      let screenshotBase64: string | undefined = undefined;
      if (options.captureScreenshot !== false) {
        const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 80 });
        screenshotBase64 = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;
        log(`[BROWSER] Screenshot captured`);
      }

      const loadTimeMs = Date.now() - startTime;

      return {
        success: true,
        url: actualUrl,
        requestedUrl: targetUrl,
        actualBrowserUrl: actualUrl,
        isBuiltInDemo: isLocal,
        title,
        status: httpStatus,
        loadTimeMs,
        domSummary: {
          buttonsCount,
          inputsCount,
          linksCount,
          headingsCount,
          sampleElements: [...sampleButtons, ...sampleInputs]
        },
        screenshotBase64,
        logs
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      log(`[BROWSER ERROR] ${errorMsg}`);
      return {
        success: false,
        url: targetUrl,
        requestedUrl: targetUrl,
        actualBrowserUrl: targetUrl,
        isBuiltInDemo: isLocal,
        title: '',
        status: null,
        loadTimeMs: Date.now() - startTime,
        domSummary: {
          buttonsCount: 0,
          inputsCount: 0,
          linksCount: 0,
          headingsCount: 0,
          sampleElements: []
        },
        logs,
        error: errorMsg
      };
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
      log(`[BROWSER] Browser closed`);
    }
  }

  /**
   * Shuts down the root browser instance
   */
  public async close(): Promise<void> {
    if (this.browser) {
      console.log('[BROWSER] Closing shared Chromium instance');
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

export const playwrightBrowserManager = PlaywrightBrowserManager.getInstance();
