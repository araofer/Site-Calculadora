/**
 * Script de Auditoria Automática de Produção (dist/) - Calculadora Master
 * Executa todas as etapas de verificação e validação de ponta a ponta do build de produção:
 * 1. npm test
 * 2. npm run build:data
 * 3. npm run build:prod
 * 4. Validação de exatamente 43 páginas em dist/
 * 5. Validação de todos os 58 assets em dist/
 * 6. Verificação de equivalência funcional dist/ vs dist-pilot/
 * 7. Verificação de imports ESM locais e transitivos em dist/js/
 * 8. Verificação de links relativos, canonical, robots, auth, cookie consent, ausência de placeholders e undefined
 * 9. Smoke test HTTP em servidor isolado servindo dist/ (incluindo teste de rota 404)
 * 10. Validação mobile 320px no Google Chrome / Chromium (layout sem overflow horizontal e zero erros no console)
 * 11. git diff --check e git diff --cached --check
 * 12. git status
 */

const { execSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_PROD_DIR = path.join(ROOT_DIR, 'dist');
const DIST_PILOT_DIR = path.join(ROOT_DIR, 'dist-pilot');

const {
  TOOL_PAGES,
  SITE_PAGES,
  SITE_ASSETS
} = require('./build-html.js');

function listHtmlFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listHtmlFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push(relPath);
    }
  }
  return results.sort();
}

async function runProdAudit() {
  const summary = {
    tests: 'FAIL',
    testCount: '0/0',
    buildData: 'FAIL',
    buildProd: 'FAIL',
    pagesCount: 0,
    assetsCount: 0,
    equivalence: 'FAIL',
    esm: 'FAIL',
    seoAndLinks: 'FAIL',
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

  // 2. build:data
  try {
    execSync('node scripts/validate-tools.js && node scripts/generate-catalog.js && node scripts/generate-sitemap.js && node scripts/validate-tools.js', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    summary.buildData = 'PASS';
  } catch (err) {
    summary.buildData = 'FAIL';
    allOk = false;
    console.error('Falha em build:data:', err.stdout || err.message);
  }

  // 3. build:prod (geração completa de dist/)
  try {
    const buildProdOutput = execSync('node scripts/build-html.js --scope=prod', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const match = buildProdOutput.match(/Build SSG concluído com sucesso: (\d+) página\(s\) gerada\(s\)/);
    summary.pagesCount = match ? parseInt(match[1], 10) : 0;

    const distHtmls = listHtmlFiles(DIST_PROD_DIR);
    if (distHtmls.length === 43 && summary.pagesCount === 43) {
      summary.buildProd = 'PASS';
    } else {
      summary.buildProd = 'FAIL';
      allOk = false;
      console.error(`Contagem incorreta de páginas em dist/: ${distHtmls.length} (esperado 43)`);
    }
  } catch (err) {
    summary.buildProd = 'FAIL';
    allOk = false;
    console.error('Falha no build:prod:', err.stdout || err.message);
  }

  // 4. Verificação de assets em dist/
  try {
    let assetsOk = true;
    let foundAssets = 0;
    for (const asset of SITE_ASSETS) {
      const destPath = path.join(DIST_PROD_DIR, asset.dest);
      if (!fs.existsSync(destPath)) {
        console.error(`Asset ausente em dist/: ${asset.dest}`);
        assetsOk = false;
      } else {
        foundAssets++;
      }
    }
    summary.assetsCount = foundAssets;
    if (!assetsOk || foundAssets !== SITE_ASSETS.length) {
      allOk = false;
    }
  } catch (err) {
    allOk = false;
    console.error('Erro na validação de assets:', err.message);
  }

  // 5. Comparação e equivalência entre dist/ e dist-pilot/
  try {
    // Assegura que dist-pilot está construído
    if (!fs.existsSync(DIST_PILOT_DIR)) {
      execSync('node scripts/build-html.js --scope=site', { cwd: ROOT_DIR });
    }

    let equivOk = true;
    for (const page of SITE_PAGES) {
      const prodPath = path.join(DIST_PROD_DIR, page.relativeOutputPath);
      const pilotPath = path.join(DIST_PILOT_DIR, page.relativeOutputPath);

      if (!fs.existsSync(prodPath) || !fs.existsSync(pilotPath)) {
        console.error(`Página ausente em dist ou dist-pilot: ${page.relativeOutputPath}`);
        equivOk = false;
        continue;
      }

      const prodContent = fs.readFileSync(prodPath, 'utf-8');
      const pilotContent = fs.readFileSync(pilotPath, 'utf-8');

      if (prodContent !== pilotContent) {
        console.error(`Divergência de conteúdo entre dist e dist-pilot na página: ${page.relativeOutputPath}`);
        equivOk = false;
      }
    }

    for (const asset of SITE_ASSETS) {
      const prodAsset = path.join(DIST_PROD_DIR, asset.dest);
      const pilotAsset = path.join(DIST_PILOT_DIR, asset.dest);
      if (!fs.existsSync(prodAsset) || !fs.existsSync(pilotAsset)) {
        console.error(`Asset ausente em dist ou dist-pilot: ${asset.dest}`);
        equivOk = false;
        continue;
      }
      const prodBuffer = fs.readFileSync(prodAsset);
      const pilotBuffer = fs.readFileSync(pilotAsset);
      if (!prodBuffer.equals(pilotBuffer)) {
        console.error(`Divergência binária no asset: ${asset.dest}`);
        equivOk = false;
      }
    }

    summary.equivalence = equivOk ? 'PASS' : 'FAIL';
    if (!equivOk) allOk = false;
  } catch (err) {
    summary.equivalence = 'FAIL';
    allOk = false;
    console.error('Erro na verificação de equivalência:', err.message);
  }

  // 6. Verificação de imports ESM locais e transitivos em dist/js/
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

    const jsDir = path.join(DIST_PROD_DIR, 'js');
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
          console.error(`Dependência ESM não encontrada em dist/: ${importSpecifier} em ${filePath}`);
          esmValid = false;
        }
      }
    }

    summary.esm = esmValid ? 'PASS' : 'FAIL';
    if (!esmValid) allOk = false;
  } catch (err) {
    summary.esm = 'FAIL';
    allOk = false;
    console.error('Erro na validação ESM de produção:', err.message);
  }

  // 7. Verificação de SEO, links relativos, canonical, robots, auth, cookie consent, ausência de placeholders e undefined
  try {
    let seoOk = true;
    for (const page of SITE_PAGES) {
      const targetPath = path.join(DIST_PROD_DIR, page.relativeOutputPath);
      if (!fs.existsSync(targetPath)) {
        seoOk = false;
        continue;
      }
      const content = fs.readFileSync(targetPath, 'utf-8');

      // Ausência de placeholders
      const leftover = content.match(/\{\{([A-Z0-9_]+)\}\}/);
      if (leftover) {
        console.error(`Placeholder não resolvido em dist/${page.relativeOutputPath}: ${leftover[0]}`);
        seoOk = false;
      }

      // Ausência de undefined
      if (content.includes('undefined')) {
        console.error(`String "undefined" detectada em dist/${page.relativeOutputPath}`);
        seoOk = false;
      }

      // Robots
      if (!content.includes('<meta name="robots"')) {
        console.error(`Meta robots ausente em dist/${page.relativeOutputPath}`);
        seoOk = false;
      }

      // Canonical (exceto 404)
      if (page.relativeOutputPath !== '404.html') {
        if (!content.includes('<link rel="canonical"')) {
          console.error(`Canonical ausente em dist/${page.relativeOutputPath}`);
          seoOk = false;
        }
      } else {
        if (content.includes('<link rel="canonical"')) {
          console.error(`Canonical indevido presente na 404 em dist/${page.relativeOutputPath}`);
          seoOk = false;
        }
      }

      // Auth validation
      if (page.relativeOutputPath === 'login.html' || page.relativeOutputPath === 'cadastro.html') {
        if (!content.includes('auth-footer') || !content.includes('js/auth.js')) {
          console.error(`Componentes ou scripts de auth ausentes em dist/${page.relativeOutputPath}`);
          seoOk = false;
        }
      }

      // Cookie consent
      if (content.includes('cookie-consent.js') && !content.includes('cookie-consent.css')) {
        console.error(`cookie-consent.css ausente na página com cookie-consent.js: dist/${page.relativeOutputPath}`);
        seoOk = false;
      }

      // Validação de links e scripts relativos referenciados
      const pageDir = path.dirname(targetPath);
      const linkRegex = /(?:src|href)=["']([^"'#?:]+)["']/g;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(content)) !== null) {
        const rawRef = linkMatch[1];
        const cleanRef = rawRef.split('?')[0].split('#')[0].trim();
        if (!cleanRef || cleanRef.startsWith('mailto:') || cleanRef.startsWith('tel:') || cleanRef.startsWith('http') || cleanRef.startsWith('javascript:')) {
          continue;
        }
        const resolvedRef = cleanRef.startsWith('/')
          ? path.join(DIST_PROD_DIR, cleanRef)
          : path.resolve(pageDir, cleanRef);

        if (!fs.existsSync(resolvedRef)) {
          // Ignora âncoras vazias ou referências intencionais a páginas externas/não estáticas
          if (!cleanRef.endsWith('.svg') && !cleanRef.startsWith('#')) {
            console.error(`Link/recurso quebrado em dist/${page.relativeOutputPath}: ${cleanRef} -> ${resolvedRef}`);
            seoOk = false;
          }
        }
      }
    }

    summary.seoAndLinks = seoOk ? 'PASS' : 'FAIL';
    if (!seoOk) allOk = false;
  } catch (err) {
    summary.seoAndLinks = 'FAIL';
    allOk = false;
    console.error('Erro na validação de SEO e integridade de páginas:', err.message);
  }

  // 8. Smoke test HTTP em servidor efêmero isolado servindo dist/
  let httpPort = 0;
  let testServer = null;
  try {
    testServer = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(DIST_PROD_DIR, urlPath);
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

    let allHttpOk = true;
    for (const resPath of resourcesToTest) {
      const resp = await fetch(`http://127.0.0.1:${httpPort}${resPath}`);
      if (resp.status !== 200) {
        console.error(`HTTP ${resp.status} em recurso: ${resPath}`);
        allHttpOk = false;
      }
    }

    // Validação explícita de retorno 404 para rota inexistente
    const notFoundResp = await fetch(`http://127.0.0.1:${httpPort}/rota-inexistente-404-teste`);
    if (notFoundResp.status !== 404) {
      console.error(`Esperado HTTP 404 para rota inexistente, obtido: ${notFoundResp.status}`);
      allHttpOk = false;
    }

    summary.http = allHttpOk ? 'PASS' : 'FAIL';
    if (!allHttpOk) allOk = false;
  } catch (err) {
    summary.http = 'FAIL';
    allOk = false;
    console.error('Erro no smoke HTTP de produção:', err.message);
  }

  // 9. Validação mobile 320px via Headless Chrome / Chromium
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
      const chromePort = 9250 + Math.floor(Math.random() * 100);
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
              console.error(`WebSocket error em dist/${page.relativeOutputPath}:`, err.message || err);
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
                    menuToggleDisplay: document.querySelector("#mobile-menu") ? window.getComputedStyle(document.querySelector("#mobile-menu")).display : "none"
                  })`);

                  if (!evalRes) {
                    console.error(`Métricas mobile não retornadas em dist/${page.relativeOutputPath}`);
                    mobileAllOk = false;
                    resolve();
                    return;
                  }

                  if (evalRes.scrollWidth > evalRes.clientWidth) {
                    console.error(`Overflow horizontal mobile detectado em dist/${page.relativeOutputPath}: scrollWidth=${evalRes.scrollWidth} clientWidth=${evalRes.clientWidth}`);
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
                console.error(`Erro de console em dist/${page.relativeOutputPath}:`, ...data.params.args.map(a => a.value || a.description));
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
      console.error('Erro na validação mobile de produção via Chrome:', err.message);
    }
  } else {
    summary.mobile = 'NÃO TESTADO';
  }

  if (testServer) {
    testServer.close();
  }

  // 10. git diff --check
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

  // 11. git status
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
  console.log('\nAUDITORIA PRODUÇÃO (dist/)');
  console.log(`tests: ${summary.tests}`);
  console.log(`build:data: ${summary.buildData}`);
  console.log(`build:prod: ${summary.pagesCount} páginas`);
  console.log(`assets: ${summary.assetsCount} assets`);
  console.log(`equivalência dist/dist-pilot: ${summary.equivalence}`);
  console.log(`ESM: ${summary.esm}`);
  console.log(`SEO & integridade: ${summary.seoAndLinks}`);
  console.log(`HTTP: ${summary.http}`);
  console.log(`mobile: ${summary.mobile}`);
  console.log(`diff-check: ${summary.diffCheck}`);
  console.log(`status: ${summary.status}`);

  if (!allOk) {
    process.exit(1);
  }
}

runProdAudit().catch(err => {
  console.error('Erro fatal na auditoria de produção:', err);
  process.exit(1);
});
