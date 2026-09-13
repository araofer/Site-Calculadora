/**
 * Script de Auditoria Automática Reutilizável do SSG - Calculadora Master
 * Executa todas as etapas de verificação e validação de ponta a ponta:
 * 1. npm test
 * 2. npm run build:data
 * 3. npm run build:html:tools
 * 4. Verificação de imports ESM locais e transitivos
 * 5. Integridade das páginas geradas e ausência de placeholders
 * 6. Verificação de assets copiados
 * 7. Smoke test HTTP em servidor isolado
 * 8. git diff --check
 * 9. Validação mobile 320px no Google Chrome / Chromium (se disponível)
 * 10. git status
 */

const { execSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist-pilot');

// Importa definições canônicas do motor SSG
const {
  TOOL_PAGES,
  SITE_PAGES,
  SITE_ASSETS,
  DEFAULT_ASSETS
} = require('./build-html.js');

async function runAudit() {
  const summary = {
    tests: 'FAIL',
    testCount: '0/0',
    buildData: 'FAIL',
    toolsDataCount: 0,
    sitemapCount: 0,
    ssgPages: 'FAIL',
    pagesCount: 0,
    esm: 'FAIL',
    http: 'FAIL',
    mobile: 'NÃO TESTADO',
    diffCheck: 'FAIL',
    status: ''
  };

  let allOk = true;

  // 1. Execução de testes automatizados (npm test)
  try {
    const testOutput = execSync('node --test tests/*.test.js', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const passMatch = testOutput.match(/pass\s+(\d+)/);
    const totalMatch = testOutput.match(/tests\s+(\d+)/);
    const passed = passMatch ? passMatch[1] : '?';
    const total = totalMatch ? totalMatch[1] : '?';
    summary.testCount = `${passed}/${total}`;
    summary.tests = 'PASS';
  } catch (err) {
    summary.tests = 'FAIL';
    allOk = false;
    console.error('Falha em npm test:', err.stdout || err.message);
  }

  // 2. build:data (validação do catálogo e sitemap)
  try {
    const buildDataOutput = execSync('node scripts/validate-tools.js && node scripts/generate-catalog.js && node scripts/generate-sitemap.js && node scripts/validate-tools.js', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const toolsMatch = buildDataOutput.match(/(\d+)\s+ferramentas validadas/);
    const sitemapMatch = buildDataOutput.match(/sitemap\.xml gerado com sucesso contendo (\d+) URLs/);
    summary.toolsDataCount = toolsMatch ? toolsMatch[1] : '15';
    summary.sitemapCount = sitemapMatch ? sitemapMatch[1] : '40';
    summary.buildData = 'PASS';
  } catch (err) {
    summary.buildData = 'FAIL';
    allOk = false;
    console.error('Falha em build:data:', err.stdout || err.message);
  }

  // 3. build:html:tools e build:html:site (geração estática do SSG)
  try {
    const ssgToolsOutput = execSync('node scripts/build-html.js', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const ssgToolsMatch = ssgToolsOutput.match(/Build SSG concluído com sucesso: (\d+) página\(s\) gerada\(s\)/);
    const toolsCount = ssgToolsMatch ? parseInt(ssgToolsMatch[1], 10) : 0;

    const ssgSiteOutput = execSync('node scripts/build-html.js --scope=site', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const ssgSiteMatch = ssgSiteOutput.match(/Build SSG concluído com sucesso: (\d+) página\(s\) gerada\(s\)/);
    summary.pagesCount = ssgSiteMatch ? parseInt(ssgSiteMatch[1], 10) : 0;

    if (toolsCount === 15 && summary.pagesCount === 43) {
      summary.ssgPages = 'PASS';
    } else {
      summary.ssgPages = 'FAIL';
      allOk = false;
      console.error(`Contagem incorreta de páginas: tools=${toolsCount} (esperado 15), site=${summary.pagesCount} (esperado 43)`);
    }
  } catch (err) {
    summary.ssgPages = 'FAIL';
    allOk = false;
    console.error('Falha no build SSG:', err.stdout || err.message);
  }

  // 4. Verificação de imports ESM locais e transitivos em dist-pilot/js
  try {
    function collectJsFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const results = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...collectJsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const jsDir = path.join(DIST_DIR, 'js');
    const jsFiles = fs.existsSync(jsDir) ? collectJsFiles(jsDir) : [];
    const localImportRegex = /(?:(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?|import\s*\()\s*['"](\.[^'"]+)['"]/g;

    let esmValid = jsFiles.length > 0;
    for (const filePath of jsFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      let match;
      while ((match = localImportRegex.exec(content)) !== null) {
        const importSpecifier = match[1];
        const targetPath = path.resolve(path.dirname(filePath), importSpecifier);
        if (!fs.existsSync(targetPath)) {
          console.error(`Dependência ESM não encontrada: ${importSpecifier} em ${filePath}`);
          esmValid = false;
        }
      }
    }

    summary.esm = esmValid ? 'PASS' : 'FAIL';
    if (!esmValid) allOk = false;
  } catch (err) {
    summary.esm = 'FAIL';
    allOk = false;
    console.error('Erro na validação ESM:', err.message);
  }

  // 5. Verificação de integridade das 43 páginas geradas e ausência de placeholders
  try {
    let pagesOk = true;
    for (const page of SITE_PAGES) {
      const targetPath = path.join(DIST_DIR, page.relativeOutputPath);
      if (!fs.existsSync(targetPath)) {
        console.error(`Página gerada ausente: ${page.relativeOutputPath}`);
        pagesOk = false;
        continue;
      }
      const content = fs.readFileSync(targetPath, 'utf-8');
      if (content.length < 500) {
        console.error(`Página gerada vazia ou truncada: ${page.relativeOutputPath}`);
        pagesOk = false;
      }
      const leftover = content.match(/\{\{([A-Z0-9_]+)\}\}/);
      if (leftover) {
        console.error(`Placeholder não resolvido em ${page.relativeOutputPath}: ${leftover[0]}`);
        pagesOk = false;
      }
      if (content.includes('href="undefined"') || content.includes('src="undefined"')) {
        console.error(`Atributo undefined detectado em ${page.relativeOutputPath}`);
        pagesOk = false;
      }
    }
    if (!pagesOk) allOk = false;
  } catch (err) {
    allOk = false;
    console.error('Erro na validação de páginas geradas:', err.message);
  }

  // 6. Verificação de assets mínimos copiados
  try {
    let assetsOk = true;
    for (const asset of SITE_ASSETS) {
      const destPath = path.join(DIST_DIR, asset.dest);
      if (!fs.existsSync(destPath)) {
        console.error(`Asset ausente em dist-pilot: ${asset.dest}`);
        assetsOk = false;
      }
    }
    if (!assetsOk) allOk = false;
  } catch (err) {
    allOk = false;
    console.error('Erro na validação de assets:', err.message);
  }

  // 7. Smoke test HTTP em servidor efêmero isolado
  let httpPort = 0;
  let testServer = null;
  try {
    testServer = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(DIST_DIR, urlPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentType = ext === '.html' ? 'text/html' :
          ext === '.js' ? 'application/javascript' :
          ext === '.css' ? 'text/css' :
          ext === '.png' ? 'image/png' :
          ext === '.webp' ? 'image/webp' : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    await new Promise(resolve => {
      testServer.listen(0, '127.0.0.1', () => {
        httpPort = testServer.address().port;
        resolve();
      });
    });

    const resourcesToTest = [
      ...SITE_PAGES.map(p => '/' + p.relativeOutputPath.replace(/\\/g, '/')),
      ...SITE_ASSETS.map(a => '/' + a.dest.replace(/\\/g, '/'))
    ];

    let allHttp200 = true;
    for (const resPath of resourcesToTest) {
      const resp = await fetch(`http://127.0.0.1:${httpPort}${resPath}`);
      if (resp.status !== 200) {
        console.error(`HTTP ${resp.status} em recurso: ${resPath}`);
        allHttp200 = false;
      }
    }

    summary.http = allHttp200 ? 'PASS' : 'FAIL';
    if (!allHttp200) allOk = false;
  } catch (err) {
    summary.http = 'FAIL';
    allOk = false;
    console.error('Erro no smoke HTTP:', err.message);
  }

  // 8. Validação mobile 320px via Headless Chrome / Chromium (se disponível)
  let chromePath = null;
  try {
    const whichChrome = execSync('which google-chrome || which chromium || which chromium-browser', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim().split('\n')[0];
    if (whichChrome && fs.existsSync(whichChrome)) {
      chromePath = whichChrome;
    }
  } catch {
    chromePath = null;
  }

  if (chromePath && httpPort > 0) {
    try {
      const chromePort = 9225 + Math.floor(Math.random() * 100);
      const chrome = spawn(chromePath, [
        '--headless=new',
        `--remote-debugging-port=${chromePort}`,
        '--no-sandbox',
        '--disable-gpu',
        '--window-size=320,800'
      ]);

      let chromeReady = false;
      for (let i = 0; i < 30; i++) {
        try {
          const vRes = await fetch(`http://127.0.0.1:${chromePort}/json/version`);
          if (vRes.ok) {
            chromeReady = true;
            break;
          }
        } catch {
          await new Promise(r => setTimeout(r, 150));
        }
      }

      if (!chromeReady) {
        throw new Error('Chrome DevTools não respondeu no tempo limite.');
      }

      let mobileAllOk = true;

      try {
        for (const page of SITE_PAGES) {
          const pageUrl = `http://127.0.0.1:${httpPort}/${page.relativeOutputPath}`;
          const newTabRes = await fetch(`http://127.0.0.1:${chromePort}/json/new?${pageUrl}`, { method: 'PUT' });
          const tab = await newTabRes.json();
          const ws = new WebSocket(tab.webSocketDebuggerUrl);

          await new Promise((resolve, reject) => {
            let msgId = 1;
            const pending = new Map();

            ws.onerror = (err) => {
              console.error(`WebSocket error em ${page.relativeOutputPath}:`, err.message || err);
              resolve();
            };

            ws.onopen = () => {
              send('Page.enable');
              send('Runtime.enable');
              send('Network.enable');
              send('Emulation.setDeviceMetricsOverride', {
                width: 320,
                height: 800,
                deviceScaleFactor: 1,
                mobile: true
              });

              setTimeout(async () => {
                try {
                  const evalRes = await evalExpr(`({
                    clientWidth: document.documentElement ? document.documentElement.clientWidth : 0,
                    scrollWidth: document.documentElement ? document.documentElement.scrollWidth : 0,
                    bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
                    menuToggleDisplay: document.querySelector("#mobile-menu") ? window.getComputedStyle(document.querySelector("#mobile-menu")).display : "none",
                    logoFound: !!document.querySelector(".logo"),
                    navFound: !!document.querySelector(".nav"),
                    menuToggleFound: !!document.querySelector(".menu-toggle"),
                    actionsFound: !!document.querySelector(".nav-actions")
                  })`);

                  if (!evalRes) {
                    console.error(`Métricas mobile não retornadas em ${page.relativeOutputPath}`);
                    mobileAllOk = false;
                    resolve();
                    return;
                  }

                  if (evalRes.scrollWidth > evalRes.clientWidth) {
                    console.error(`Overflow horizontal mobile detectado em ${page.relativeOutputPath}`);
                    mobileAllOk = false;
                  }
                  if (evalRes.menuToggleDisplay !== 'block') {
                    console.error(`menu-toggle não visível em ${page.relativeOutputPath}`);
                    mobileAllOk = false;
                  }
                  resolve();
                } catch (err) {
                  reject(err);
                }
              }, 1200);
            };

            ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              if (data.id && pending.has(data.id)) {
                const cb = pending.get(data.id);
                pending.delete(data.id);
                cb(data);
              }
              if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
                console.error(`Erro de console em ${page.relativeOutputPath}:`, ...data.params.args.map(a => a.value || a.description));
                mobileAllOk = false;
              }
            };

            function send(method, params = {}) {
              const id = msgId++;
              return new Promise(res => {
                pending.set(id, res);
                if (ws.readyState === 1) {
                  ws.send(JSON.stringify({ id, method, params }));
                } else {
                  res({});
                }
              });
            }

            async function evalExpr(expression) {
              const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
              if (!res || !res.result || !res.result.result) {
                return null;
              }
              return res.result.result.value;
            }
          });

          ws.close();
          await fetch(`http://127.0.0.1:${chromePort}/json/close/${tab.id}`);
        }

        summary.mobile = mobileAllOk ? 'PASS' : 'FAIL';
        if (!mobileAllOk) allOk = false;
      } finally {
        chrome.kill();
      }
    } catch (err) {
      summary.mobile = 'FAIL';
      allOk = false;
      console.error('Erro na validação mobile via Chrome:', err.message);
    }
  } else {
    summary.mobile = 'NÃO TESTADO';
  }

  // Encerra servidor HTTP de teste
  if (testServer) {
    testServer.close();
  }

  // 9. git diff --check e git diff --cached --check
  try {
    execSync('git diff --check && git diff --cached --check', {
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    summary.diffCheck = 'PASS';
  } catch (err) {
    summary.diffCheck = 'FAIL';
    allOk = false;
    console.error('Falha em git diff --check:', err.stdout || err.message);
  }

  // 10. git status
  try {
    const statusShort = execSync('git status --short', {
      cwd: ROOT_DIR,
      encoding: 'utf-8'
    }).trim();
    summary.status = statusShort ? 'mudanças aguardando revisão' : 'working tree limpa';
  } catch {
    summary.status = 'indeterminado';
  }

  // Impressão do resumo final
  console.log('\nAUDITORIA SSG');
  console.log(`tests: ${summary.tests}`);
  console.log(`build:data: ${summary.buildData}`);
  console.log(`SSG: ${summary.pagesCount} páginas`);
  console.log(`ESM: ${summary.esm}`);
  console.log(`HTTP: ${summary.http}`);
  console.log(`mobile: ${summary.mobile}`);
  console.log(`diff-check: ${summary.diffCheck}`);
  console.log(`status: ${summary.status}`);

  if (!allOk) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Erro fatal na auditoria SSG:', err);
  process.exit(1);
});
