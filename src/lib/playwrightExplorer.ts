import type { Page, BrowserContext } from 'playwright';
import { playwrightBrowserManager } from './playwrightService';
import { validateUrlSafety } from './qaAgent';

export interface ObservedElement {
  tagName: string;
  selector: string;
  text: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
  type?: string;
  placeholder?: string;
  href?: string;
  name?: string;
  isVisible: boolean;
  isEnabled: boolean;
  isSafeNav?: boolean;
}

export interface FormObservation {
  id?: string;
  name?: string;
  action?: string;
  method?: string;
  inputsCount: number;
  inputNames: string[];
}

export interface PageObservation {
  url: string;
  pathOrState: string;
  title: string;
  headingSummary: string[];
  textSnippet: string;
  discoveredAt: string;
  elements: {
    buttons: ObservedElement[];
    links: ObservedElement[];
    inputs: ObservedElement[];
    selects: ObservedElement[];
    textareas: ObservedElement[];
    forms: FormObservation[];
  };
  totalInteractiveCount: number;
  screenshotBase64?: string;
}

export interface DiscoveredNavigationCandidate {
  type: 'link' | 'button' | 'nav-control';
  selector: string;
  label: string;
  targetHref?: string;
  isSameOrigin: boolean;
}

export interface ExplorationOptions {
  startUrl: string;
  maxPages?: number;
  maxDepth?: number;
  timeoutMs?: number;
  captureScreenshots?: boolean;
  sameOriginOnly?: boolean;
  exploreSpaStates?: boolean;
}

export interface ExplorationResult {
  success: boolean;
  startUrl: string;
  actualFinalUrl?: string;
  isBuiltInDemo?: boolean;
  totalPagesVisited: number;
  totalElementsDiscovered: number;
  visitedPages: PageObservation[];
  discoveredRoutes: DiscoveredNavigationCandidate[];
  logs: string[];
  durationMs: number;
  error?: string;
}

/**
 * PlaywrightExplorer
 * Phase 2: Real Browser-Based Autonomous Web Exploration Service
 * 
 * Uses the real Playwright Chromium browser from PlaywrightBrowserManager to:
 * 1. Navigate to target URL
 * 2. Observe the live DOM deeply without hardcoding selectors
 * 3. Discover links, inputs, buttons, selects, forms dynamically
 * 4. Safely traverse links and SPA navigation controls
 * 5. Track visited paths/states to avoid infinite loops
 * 6. Collect structured page observations and screenshot evidence
 */
export class PlaywrightExplorer {
  private logs: string[] = [];

  private log(message: string): void {
    const formatted = `[EXPLORE] ${message}`;
    console.log(formatted);
    this.logs.push(formatted);
  }

  /**
   * Main entry point for autonomous exploration
   */
  public async explore(options: ExplorationOptions): Promise<ExplorationResult> {
    const startTime = Date.now();
    this.logs = [];

    const {
      startUrl,
      maxPages = 5,
      timeoutMs = 15000,
      captureScreenshots = true,
      exploreSpaStates = true
    } = options;

    this.log(`Initiating autonomous exploration for ${startUrl}`);
    this.log(`Exploration bounds: maxPages=${maxPages}, timeoutMs=${timeoutMs}, screenshots=${captureScreenshots}`);

    let context: BrowserContext | null = null;
    let page: Page | null = null;
    const visitedPages: PageObservation[] = [];
    const allDiscoveredCandidates: DiscoveredNavigationCandidate[] = [];
    const visitedSignatures = new Set<string>();

    const isLocal = startUrl.trim().startsWith('http://localhost:3000') || startUrl.trim().startsWith('http://127.0.0.1:3000');
    let actualFinalUrl = startUrl;

    try {
      // 1. Create real browser context and page using the Phase 1 browser manager
      const setup = await playwrightBrowserManager.createPage();
      context = setup.context;
      page = setup.page;

      // Real-time route interception for SSRF and private-network protection
      await page.route('**', async (route) => {
        const reqUrl = route.request().url();
        const urlCheck = validateUrlSafety(reqUrl, isLocal);
        if (!urlCheck.safe) {
          this.log(`[SECURITY] Blocked network request during exploration: ${reqUrl} (${urlCheck.reason})`);
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });

      // 2. Navigate to startUrl
      this.log(`Navigating to entry point: ${startUrl}`);
      const response = await page.goto(startUrl, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs
      });

      actualFinalUrl = page.url();
      const redirectCheck = validateUrlSafety(actualFinalUrl, isLocal);
      if (!redirectCheck.safe) {
        throw new Error(`Navigation redirected to unsafe destination: ${actualFinalUrl} (${redirectCheck.reason})`);
      }

      const statusCode = response ? response.status() : 200;
      this.log(`Initial page loaded with HTTP ${statusCode} (Current URL: ${actualFinalUrl})`);

      // Allow potential React / client hydration
      await page.waitForTimeout(1000);

      // 3. Inspect the root landing state
      const initialObservation = await this.observeLivePage(page, actualFinalUrl, 'root', captureScreenshots);
      visitedPages.push(initialObservation);
      visitedSignatures.add(this.createPageSignature(initialObservation));
      this.log(`Page 1 indexed: "${initialObservation.title}" (${initialObservation.totalInteractiveCount} interactive elements)`);

      // 4. Extract dynamic navigation candidates from live DOM
      const candidates = await this.discoverNavigationCandidates(page, startUrl);
      for (const cand of candidates) {
        if (!allDiscoveredCandidates.some(c => c.selector === cand.selector && c.label === cand.label)) {
          allDiscoveredCandidates.push(cand);
        }
      }
      this.log(`Discovered ${candidates.length} dynamic navigation candidates from root page`);

      // 5. Safely traverse discovered links / safe SPA controls up to maxPages
      let pageCount = 1;

      // First priority: Real <a> links pointing to same origin
      const unvisitedLinks = candidates.filter(c => c.type === 'link' && c.targetHref && c.isSameOrigin);
      for (const linkCand of unvisitedLinks) {
        if (pageCount >= maxPages) break;
        if (!linkCand.targetHref) continue;

        try {
          this.log(`Navigating dynamic link [${linkCand.label}] -> ${linkCand.targetHref}`);
          await page.goto(linkCand.targetHref, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
          await page.waitForTimeout(500);

          const observation = await this.observeLivePage(page, linkCand.targetHref, linkCand.label, captureScreenshots);
          const sig = this.createPageSignature(observation);

          if (!visitedSignatures.has(sig)) {
            visitedSignatures.add(sig);
            visitedPages.push(observation);
            pageCount++;
            this.log(`Page ${pageCount} indexed via <a> link: "${observation.title}"`);
          } else {
            this.log(`Page state already visited (duplicate signature), skipping duplicate`);
          }
        } catch (linkErr: any) {
          this.log(`Warning: Failed to navigate link ${linkCand.targetHref}: ${linkErr?.message || linkErr}`);
        }
      }

      // Second priority: SPA safe navigation controls (tabs, categories, product inspection)
      if (exploreSpaStates && pageCount < maxPages) {
        // Return to startUrl if we moved
        if (page.url() !== startUrl) {
          await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
          await page.waitForTimeout(500);
        }

        const safeControls = candidates.filter(c => c.type === 'nav-control' || c.type === 'button');
        for (const control of safeControls) {
          if (pageCount >= maxPages) break;

          try {
            // Check if element is currently visible and enabled in DOM
            const locator = page.locator(control.selector).first();
            const isVisible = await locator.isVisible().catch(() => false);
            const isEnabled = await locator.isEnabled().catch(() => false);

            if (!isVisible || !isEnabled) continue;

            this.log(`Interacting with safe SPA navigation: "${control.label}" (${control.selector})`);
            await locator.click({ timeout: 2000 }).catch(async () => {
              await locator.evaluate((el: HTMLElement) => el.click()).catch(() => {});
            });
            await page.waitForTimeout(400); // Allow React re-render

            const currentUrl = page.url();
            const observation = await this.observeLivePage(page, currentUrl, `SPA:${control.label}`, captureScreenshots);
            const sig = this.createPageSignature(observation);

            if (!visitedSignatures.has(sig)) {
              visitedSignatures.add(sig);
              visitedPages.push(observation);
              pageCount++;
              this.log(`Page state ${pageCount} indexed via SPA control [${control.label}]: ${observation.totalInteractiveCount} interactive elements`);
            }

            // Return to home state if sub-view has a home/back button to continue multi-branch exploration
            const homeBtn = page.locator('#btn-nav-home, button:has-text("Home"), button:has-text("Continue Shopping")').first();
            if (await homeBtn.isVisible().catch(() => false)) {
              await homeBtn.click({ timeout: 1500 }).catch(() => {});
              await page.waitForTimeout(300);
            }
          } catch (ctrlErr: any) {
            this.log(`Safe nav click bypassed for [${control.label}]: ${ctrlErr?.message || ctrlErr}`);
          }
        }
      }

      const totalElementsDiscovered = visitedPages.reduce((acc, p) => acc + p.totalInteractiveCount, 0);
      const durationMs = Date.now() - startTime;

      this.log(`Exploration completed successfully in ${durationMs}ms`);
      this.log(`Summary: ${visitedPages.length} states/pages explored, ${totalElementsDiscovered} interactive elements cataloged, ${allDiscoveredCandidates.length} routes discovered`);

      return {
        success: true,
        startUrl,
        actualFinalUrl,
        isBuiltInDemo: isLocal,
        totalPagesVisited: visitedPages.length,
        totalElementsDiscovered,
        visitedPages,
        discoveredRoutes: allDiscoveredCandidates,
        logs: this.logs,
        durationMs
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      this.log(`Exploration error: ${errorMsg}`);
      return {
        success: false,
        startUrl,
        actualFinalUrl,
        isBuiltInDemo: isLocal,
        totalPagesVisited: visitedPages.length,
        totalElementsDiscovered: visitedPages.reduce((acc, p) => acc + p.totalInteractiveCount, 0),
        visitedPages,
        discoveredRoutes: allDiscoveredCandidates,
        logs: this.logs,
        durationMs: Date.now() - startTime,
        error: errorMsg
      };
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
      this.log(`Browser session closed cleanly`);
    }
  }

  /**
   * Deeply observes the live DOM of the current page using real Playwright APIs
   */
  public async observeLivePage(
    page: Page,
    currentUrl: string,
    stateContext: string,
    captureScreenshot: boolean
  ): Promise<PageObservation> {
    const title = await page.title().catch(() => 'Untitled');
    const liveUrl = page.url() || currentUrl;

    // Collect headings for high-level semantic context
    const headings = await page.locator('h1, h2, h3').evaluateAll(elements =>
      elements.map(el => (el.textContent || '').trim()).filter(Boolean).slice(0, 8)
    ).catch(() => []);

    // Collect visible text summary
    const textSnippet = await page.locator('body').evaluate(body => {
      const clone = body.cloneNode(true) as HTMLElement;
      // Remove scripts, styles, noscripts
      clone.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove());
      const rawText = clone.textContent || '';
      return rawText.replace(/\s+/g, ' ').trim().slice(0, 300);
    }).catch(() => '');

    // 1. Discover Buttons
    const buttons: ObservedElement[] = await page.locator('button').evaluateAll(btns =>
      btns.map((b, index) => {
        const btn = b as HTMLButtonElement;
        const text = (btn.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        const id = btn.id || undefined;
        const className = btn.className || undefined;
        const ariaLabel = btn.getAttribute('aria-label') || undefined;
        const type = btn.getAttribute('type') || 'button';
        const isEnabled = !btn.disabled;
        const rect = btn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;

        // Generate robust selector
        let selector = 'button';
        if (id) {
          selector = `#${id}`;
        } else if (ariaLabel) {
          selector = `button[aria-label="${ariaLabel}"]`;
        } else if (text && text.length > 2 && text.length < 25) {
          selector = `button:has-text("${text.replace(/"/g, '\\"')}")`;
        } else {
          selector = `button >> nth=${index}`;
        }

        const isSafeNav = /view|detail|cat|tab|product|browse|back|page|cart|home/i.test(text || '') &&
                          !/delete|remove|clear|buy|pay|order|checkout|cancel/i.test(text || '');

        return {
          tagName: 'button',
          selector,
          text: text || `[Button #${index + 1}]`,
          id,
          className: className ? className.slice(0, 50) : undefined,
          ariaLabel,
          type,
          isVisible,
          isEnabled,
          isSafeNav
        };
      })
    ).catch(() => []);

    // 2. Discover Links
    const links: ObservedElement[] = await page.locator('a').evaluateAll(anchors =>
      anchors.map((anc, index) => {
        const a = anc as HTMLAnchorElement;
        const text = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        const href = a.getAttribute('href') || undefined;
        const id = a.id || undefined;
        const className = a.className || undefined;
        const ariaLabel = a.getAttribute('aria-label') || undefined;
        const rect = a.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;

        let selector = 'a';
        if (id) {
          selector = `#${id}`;
        } else if (href && !href.startsWith('#')) {
          selector = `a[href="${href}"]`;
        } else if (text) {
          selector = `a:has-text("${text.replace(/"/g, '\\"')}")`;
        } else {
          selector = `a >> nth=${index}`;
        }

        return {
          tagName: 'a',
          selector,
          text: text || href || `[Link #${index + 1}]`,
          id,
          className: className ? className.slice(0, 50) : undefined,
          ariaLabel,
          href,
          isVisible,
          isEnabled: true
        };
      })
    ).catch(() => []);

    // 3. Discover Inputs
    const inputs: ObservedElement[] = await page.locator('input').evaluateAll(inps =>
      inps.map((i, index) => {
        const inp = i as HTMLInputElement;
        const id = inp.id || undefined;
        const name = inp.name || undefined;
        const type = inp.type || 'text';
        const placeholder = inp.placeholder || undefined;
        const ariaLabel = inp.getAttribute('aria-label') || undefined;
        const rect = inp.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && type !== 'hidden';
        const isEnabled = !inp.disabled;

        let selector = 'input';
        if (id) {
          selector = `#${id}`;
        } else if (name) {
          selector = `input[name="${name}"]`;
        } else if (placeholder) {
          selector = `input[placeholder="${placeholder}"]`;
        } else {
          selector = `input[type="${type}"] >> nth=${index}`;
        }

        return {
          tagName: 'input',
          selector,
          text: placeholder || name || id || type,
          id,
          name,
          type,
          placeholder,
          ariaLabel,
          isVisible,
          isEnabled
        };
      })
    ).catch(() => []);

    // 4. Discover Selects
    const selects: ObservedElement[] = await page.locator('select').evaluateAll(sels =>
      sels.map((s, index) => {
        const sel = s as HTMLSelectElement;
        const id = sel.id || undefined;
        const name = sel.name || undefined;
        const rect = sel.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;

        let selector = id ? `#${id}` : name ? `select[name="${name}"]` : `select >> nth=${index}`;

        return {
          tagName: 'select',
          selector,
          text: `[Select ${id || name || index}]`,
          id,
          name,
          isVisible,
          isEnabled: !sel.disabled
        };
      })
    ).catch(() => []);

    // 5. Discover Textareas
    const textareas: ObservedElement[] = await page.locator('textarea').evaluateAll(txts =>
      txts.map((t, index) => {
        const txt = t as HTMLTextAreaElement;
        const id = txt.id || undefined;
        const name = txt.name || undefined;
        const placeholder = txt.placeholder || undefined;
        const rect = txt.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;

        let selector = id ? `#${id}` : name ? `textarea[name="${name}"]` : `textarea >> nth=${index}`;

        return {
          tagName: 'textarea',
          selector,
          text: placeholder || name || id || `[Textarea #${index + 1}]`,
          id,
          name,
          placeholder,
          isVisible,
          isEnabled: !txt.disabled
        };
      })
    ).catch(() => []);

    // 6. Discover Forms
    const forms: FormObservation[] = await page.locator('form').evaluateAll(frms =>
      frms.map(fr => {
        const f = fr as HTMLFormElement;
        const id = f.id || undefined;
        const name = f.getAttribute('name') || undefined;
        const action = f.getAttribute('action') || undefined;
        const method = (f.getAttribute('method') || 'GET').toUpperCase();
        const formInputs = Array.from(f.querySelectorAll('input, select, textarea'));
        const inputNames = formInputs.map(i => (i as HTMLInputElement).name || (i as HTMLElement).id || '').filter(Boolean);

        return {
          id,
          name,
          action,
          method,
          inputsCount: formInputs.length,
          inputNames
        };
      })
    ).catch(() => []);

    // Capture binary screenshot if requested
    let screenshotBase64: string | undefined = undefined;
    if (captureScreenshot) {
      try {
        const buf = await page.screenshot({ type: 'jpeg', quality: 75 });
        screenshotBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
      } catch (e) {
        // Screenshot capture failure should not block exploration
      }
    }

    const totalInteractiveCount = buttons.length + links.length + inputs.length + selects.length + textareas.length;

    return {
      url: liveUrl,
      pathOrState: stateContext,
      title,
      headingSummary: headings,
      textSnippet,
      discoveredAt: new Date().toISOString(),
      elements: {
        buttons,
        links,
        inputs,
        selects,
        textareas,
        forms
      },
      totalInteractiveCount,
      screenshotBase64
    };
  }

  /**
   * Discovers candidate navigation actions from live DOM (links, tabs, categories, safe buttons)
   */
  private async discoverNavigationCandidates(
    page: Page,
    baseUrl: string
  ): Promise<DiscoveredNavigationCandidate[]> {
    const candidates: DiscoveredNavigationCandidate[] = [];
    const baseOrigin = new URL(baseUrl).origin;

    // 1. Analyze <a> links
    const linkItems = await page.locator('a[href]').evaluateAll((anchors, origin) =>
      anchors.map(a => {
        const href = a.getAttribute('href') || '';
        const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
        let resolvedUrl = '';
        let isSameOrigin = false;

        try {
          const u = new URL(href, window.location.origin);
          resolvedUrl = u.href;
          isSameOrigin = u.origin === origin;
        } catch {
          resolvedUrl = href;
        }

        return {
          selector: a.id ? `#${a.id}` : `a[href="${href}"]`,
          label: text || href,
          targetHref: resolvedUrl,
          isSameOrigin,
          isHash: href.startsWith('#')
        };
      }),
      baseOrigin
    ).catch(() => []);

    for (const item of linkItems) {
      if (!item.targetHref || item.isHash) continue;
      candidates.push({
        type: 'link',
        selector: item.selector,
        label: item.label,
        targetHref: item.targetHref,
        isSameOrigin: item.isSameOrigin
      });
    }

    // 2. Analyze interactive navigation buttons (e.g. tabs, category filters, product cards)
    const buttonNavItems = await page.locator('button').evaluateAll(buttons =>
      buttons.map((btn, index) => {
        const text = (btn.textContent || '').trim().replace(/\s+/g, ' ');
        const ariaLabel = btn.getAttribute('aria-label') || '';
        const id = btn.id || '';
        const rect = btn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;

        // Detect if this is a safe navigation or inspection button
        const isNavPattern = /all|electronic|audio|wearable|view|catalog|tab|details|cart|browse|explore|filter/i.test(text || ariaLabel) &&
                            !/delete|remove|clear|submit|buy|order|place|pay|confirm/i.test(text || ariaLabel);

        let selector = '';
        if (id) {
          selector = `#${id}`;
        } else if (ariaLabel) {
          selector = `button[aria-label="${ariaLabel}"]`;
        } else if (text && text.length < 30) {
          selector = `button:has-text("${text.replace(/"/g, '\\"')}")`;
        } else {
          selector = `button >> nth=${index}`;
        }

        return {
          selector,
          label: text || ariaLabel || `Button ${index}`,
          isNav: isNavPattern && isVisible
        };
      })
    ).catch(() => []);

    for (const item of buttonNavItems) {
      if (item.isNav) {
        candidates.push({
          type: 'nav-control',
          selector: item.selector,
          label: item.label,
          isSameOrigin: true
        });
      }
    }

    return candidates;
  }

  /**
   * Creates a deterministic fingerprint of an observed page state to prevent circular revisits
   */
  private createPageSignature(obs: PageObservation): string {
    const headingKey = obs.headingSummary.join('|');
    const buttonNames = obs.elements.buttons.slice(0, 5).map(b => b.text).join('|');
    const inputNames = obs.elements.inputs.slice(0, 5).map(i => i.name || i.id || i.type).join('|');
    return `${obs.url}::${headingKey}::${buttonNames}::${inputNames}`;
  }
}

export const playwrightExplorer = new PlaywrightExplorer();
