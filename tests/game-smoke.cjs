// Run against a local HTTP server. Requires Playwright (or PLAYWRIGHT_MODULE).
// GAME_URL defaults to http://127.0.0.1:4173; GAME_SCREENSHOTS is optional.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 const page = await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error') errors.push(m.text())});
 await page.goto(process.env.GAME_URL || 'http://127.0.0.1:4173');
 await page.waitForSelector('body.game-ready');
 if (process.env.GAME_SCREENSHOTS) await page.screenshot({path:process.env.GAME_SCREENSHOTS + '/intro.png'});
 await page.locator('#intro-start').focus();await page.keyboard.press('Enter');
 await page.waitForSelector('#intro',{state:'hidden'});
 assert.equal(await page.locator('#game-menu').isVisible(),false);
 await page.locator('#btn-menu').click();
 assert.equal(await page.locator('#btn-menu').getAttribute('aria-expanded'),'true');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#game-menu').isVisible(),false);
 await page.locator('#btn-menu').click();
 await page.locator('#game-canvas').click({position:{x:800,y:700}});
 assert.equal(await page.locator('#game-menu').isVisible(),false);
 await page.waitForTimeout(3200);
 if (process.env.GAME_SCREENSHOTS) await page.screenshot({path:process.env.GAME_SCREENSHOTS + '/desktop.png'});
 // Same clear stretch of path: running must travel farther than walking.
 const travel = async (run) => {
   await page.evaluate(()=>{const g=__lifeGame.state;g.player.x=360;g.player.y=220;g.keys={};});
   await page.locator('#game-canvas').focus();
   if(run) await page.keyboard.down('Shift');
   await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);
   await page.keyboard.up('ArrowRight');await page.keyboard.up('Shift');
   return page.evaluate(()=>__lifeGame.state.player.x-360);
 };
 const walk=await travel(false), run=await travel(true);
 assert.ok(walk>5 && run>walk*1.2, 'Shift should increase travel distance');
 await page.keyboard.press('m');await page.waitForSelector('.journey-map');
 assert.equal(await page.locator('.chapter-stop').count(),9);
 await page.keyboard.press('Shift+Tab');
 assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.chapter-stop:last-child button')),true);
 await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.panel-close')),true);
 if (process.env.GAME_SCREENSHOTS) await page.screenshot({path:process.env.GAME_SCREENSHOTS + '/map.png'});
 await page.getByRole('button',{name:'前往 →'}).nth(2).click();
 await page.waitForTimeout(450);
 assert.equal(await page.evaluate(()=>__lifeGame.state.scene.id),'county');
 if (process.env.GAME_SCREENSHOTS) await page.screenshot({path:process.env.GAME_SCREENSHOTS + '/county.png'});
 await page.locator('#btn-menu').click();
 await page.locator('#btn-settings').click();
 assert.equal(await page.locator('#game-menu').isVisible(),false);
 await page.getByLabel('村庄时段').selectOption('day');
 await page.keyboard.press('Escape');
 await page.waitForTimeout(250);await page.reload();
 await page.waitForSelector('body.game-ready');
 assert.equal(await page.evaluate(()=>__lifeGame.state.settings.dayCycle),false);
 // Every scene must build and render.
 const scenes=await page.evaluate(()=>Object.keys(LIFE_DATA.scenes).filter(k=>LIFE_DATA.scenes[k].map));
 for(const id of scenes){
   await page.evaluate(id=>__lifeGame.warp(id),id);await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>__lifeGame.state.scene.id),id);
 }
 await page.evaluate(()=>__lifeGame.warp('village'));await page.waitForTimeout(250);
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));
 await mp.goto(process.env.GAME_URL || 'http://127.0.0.1:4173');await mp.locator('#intro-start').click();
 await mp.waitForTimeout(3200);if (process.env.GAME_SCREENSHOTS) await mp.screenshot({path:process.env.GAME_SCREENSHOTS + '/mobile.png'});
 assert.equal(await mp.locator('#game-menu').isVisible(),false);
 await mp.locator('#btn-menu').click();
 await mp.locator('#btn-map').click();await mp.waitForSelector('.journey-map');
 assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const fallback=await browser.newContext({javaScriptEnabled:false});const fp=await fallback.newPage();
 await fp.goto(process.env.GAME_URL || 'http://127.0.0.1:4173');assert.equal(await fp.locator('#game-root').isVisible(),false);assert.equal(await fp.locator('#static-fallback').isVisible(),true);
 await fallback.close();await mobile.close();await browser.close();
 console.log(JSON.stringify({scenes,errors}));assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exit(1)});
