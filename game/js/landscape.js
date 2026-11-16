// Original procedural landscape: cached terrain edges and shadows, live sunlight.
window.LGLandscape = (function () {
  'use strict';
  const T = 16;
  function hash(x, y) {
    let n = Math.imul(x + 7919, 374761393) ^ Math.imul(y + 104729, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n ^ (n >>> 16)) >>> 0;
  }
  function terrain(def, legend, col, row) {
    const line = def.map[row];
    return line && legend[line[col]] || {};
  }
  function decorate(g, def, legend, pad) {
    g.save();
    g.translate(pad, pad);
    def.map.forEach(function (line, row) {
      Array.from(line).forEach(function (_, col) {
        const spec = terrain(def, legend, col, row);
        const x = col * T, y = row * T, seed = hash(col, row);
        // Irregular grass patches break up the repeating tile grid.
        if (spec.tile === 'grass' || spec.tile === 'grassFlower') {
          g.fillStyle = seed % 3 ? 'rgba(222,235,136,.10)' : 'rgba(39,92,53,.09)';
          g.fillRect(x + seed % 7, y + (seed >>> 4) % 6, 7, 4);
          if (!spec.entity && seed % 7 === 0) {
            const xx = x + 3 + seed % 9, yy = y + 5 + (seed >>> 5) % 8;
            g.fillStyle = '#4e854e';
            g.fillRect(xx, yy, 1, 3); g.fillRect(xx - 2, yy - 1, 1, 3);
            g.fillStyle = '#bad384'; g.fillRect(xx + 1, yy - 2, 1, 3);
          }
        }
        // Soften the square edges of paths with uneven earth and grass tufts.
        if (spec.tile === 'path') {
          [[0,-1],[1,0],[0,1],[-1,0]].forEach(function (dir, edge) {
            const other = terrain(def, legend, col + dir[0], row + dir[1]);
            if (!/^grass/.test(other.tile || '')) return;
            for (let p = 0; p < T; p++) {
              const depth = 1 + hash(col * T + p, row + edge) % 3;
              g.fillStyle = p % 3 ? '#84ad62' : '#638e50';
              if (edge === 0) g.fillRect(x + p, y, 1, depth);
              if (edge === 2) g.fillRect(x + p, y + T - depth, 1, depth);
              if (edge === 3) g.fillRect(x, y + p, depth, 1);
              if (edge === 1) g.fillRect(x + T - depth, y + p, depth, 1);
            }
          });
        }
        // Roof ridge, eaves and a cast shadow make the tile-built cottage read as one building.
        if (/^roof/.test(spec.tile)) {
          if (!/^roof/.test(terrain(def, legend, col, row - 1).tile)) {
            g.fillStyle = '#edb27a'; g.fillRect(x, y, T, 2);
            g.fillStyle = '#683f35'; g.fillRect(x, y + 2, T, 1);
          }
          if (!/^roof/.test(terrain(def, legend, col, row + 1).tile)) {
            g.fillStyle = '#754536'; g.fillRect(x, y + T - 2, T, 2);
            g.fillStyle = 'rgba(69,44,35,.23)'; g.fillRect(x, y + T, T, 4);
          }
        }
      });
    });
    // A small attic window and chimney give each tile-built roof a focal point.
    def.map.forEach(function (line, row) {
      for (let col = 0; col < line.length; col++) {
        if (!/^roof/.test(terrain(def, legend, col, row).tile) ||
            /^roof/.test(terrain(def, legend, col - 1, row).tile) ||
            /^roof/.test(terrain(def, legend, col, row - 1).tile)) continue;
        let end = col;
        while (/^roof/.test(terrain(def, legend, end, row).tile)) end++;
        if (end - col < 4) continue;
        const x = Math.round((col + end) * T / 2), y = row * T + 9;
        g.fillStyle = 'rgba(67,40,31,.24)'; g.fillRect(x - 12, y + 11, 27, 17);
        g.fillStyle = '#e7c99b'; g.fillRect(x - 10, y + 4, 20, 20);
        g.fillStyle = '#674737'; g.fillRect(x - 11, y + 23, 22, 2);
        for (let i = 0; i < 8; i++) {
          g.fillStyle = i % 2 ? '#8d4f3c' : '#b87150';
          g.fillRect(x - 2 - i * 2, y + i, 4 + i * 4, 2);
        }
        g.fillStyle = '#6e5039'; g.fillRect(x - 6, y + 10, 12, 11);
        g.fillStyle = '#f9dc93'; g.fillRect(x - 4, y + 11, 8, 8);
        g.fillStyle = '#98704c'; g.fillRect(x, y + 11, 1, 8); g.fillRect(x - 4, y + 15, 8, 1);
        const chimneyX = (end - 2) * T;
        g.fillStyle = '#755448'; g.fillRect(chimneyX, row * T - 7, 9, 18);
        g.fillStyle = '#b48970'; g.fillRect(chimneyX + 1, row * T - 6, 7, 16);
        g.fillStyle = '#664b40'; g.fillRect(chimneyX - 1, row * T - 9, 11, 4);
        g.fillRect(chimneyX + 1, row * T, 7, 1); g.fillRect(chimneyX + 1, row * T + 5, 7, 1);
      }
    });
    g.restore();
  }
  function shadows(ctx, entities) {
    ctx.save();
    ctx.fillStyle = 'rgba(32,64,49,.19)';
    for (const e of entities) {
      if (e.kind !== 'tree' && !['selfhouse','resident','school','office','shop'].includes(e.kind)) continue;
      ctx.beginPath();
      ctx.ellipse(e.x + 8, e.baseline - 1, e.drawW * .62, e.drawH * .19, -.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const periods = {dawn:.26, morning:.30, day:.48, dusk:.76, night:.94};
  function daylight(state) {
    if (Object.hasOwn(periods,state.settings.timeOfDay)) return periods[state.settings.timeOfDay];
    if (state.settings.dayCycle === false || state.settings.reducedMotion === true ||
      (state.settings.reducedMotion === null && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return .48;
    return (state.time / 480 + .42) % 1;
  }
  function nightAmount(state) {
    const sun = Math.sin((daylight(state)-.25)*Math.PI*2);
    const t = Math.max(0,Math.min(1,(.22-sun)/.55));
    return t*t*(3-2*t);
  }
  function lights(def, legend) {
    const result=[];
    if(def.indoor) return result;
    def.map.forEach((line,y)=>Array.from(line).forEach((_,x)=>{
      const spec=terrain(def,legend,x,y);
      if(spec.tile==='window') result.push({x:x*T+8,y:y*T+8,kind:'window'});
      if(spec.entity==='lamp') result.push({x:x*T+6,y:y*T-5,kind:'lamp'});
      if(['selfhouse','resident','shop','store','office','conv'].includes(spec.entity))
        result.push({x:x*T+6,y:y*T-6,kind:'window'});
    }));
    return result;
  }
  let glowSprite;
  function light(ctx, state, width, height, scale) {
    if (state.scene.def.indoor) return;
    const phase=daylight(state), night=nightAmount(state);
    const dusk=Math.max(0,1-Math.abs(phase-.75)/.12);
    ctx.save();
    ctx.fillStyle='rgba(15,25,65,'+(night*.66)+')'; ctx.fillRect(0,0,width,height);
    ctx.fillStyle='rgba(218,112,54,'+(dusk*.18)+')'; ctx.fillRect(0,0,width,height);
    if(night<.95) {
      const glow=ctx.createLinearGradient(0,0,width,height);
      glow.addColorStop(0,'rgba(255,226,160,'+(.1*(1-night))+')');
      glow.addColorStop(.7,'rgba(255,235,172,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    }
    if(night>.02) {
      if(!glowSprite) {
        glowSprite=document.createElement('canvas');glowSprite.width=glowSprite.height=64;
        const g=glowSprite.getContext('2d'), gradient=g.createRadialGradient(32,32,1,32,32,32);
        gradient.addColorStop(0,'rgba(255,207,112,.65)');
        gradient.addColorStop(.3,'rgba(255,183,83,.27)');gradient.addColorStop(1,'rgba(255,166,66,0)');
        g.fillStyle=gradient;g.fillRect(0,0,64,64);
      }
      ctx.globalCompositeOperation='screen';ctx.globalAlpha=night;
      for(const lamp of state.scene.lights || []) {
        const x=(lamp.x-Math.round(state.camera.x))*scale, y=(lamp.y-Math.round(state.camera.y))*scale;
        const size=(lamp.kind==='lamp'?64:42)*scale;
        if(x < -size || x > width+size || y < -size || y > height+size) continue;
        ctx.drawImage(glowSprite,x-size/2,y-size/2,size,size);
        ctx.fillStyle='#ffdc8e';
        if(lamp.kind==='window') {
          for(const dx of [-3,1])for(const dy of [-3,1])ctx.fillRect(x+dx*scale,y+dy*scale,2*scale,2*scale);
        }else ctx.fillRect(x-2*scale,y-2*scale,4*scale,4*scale);
      }
    }
    ctx.restore();
  }
  function map(canvas, state) {
    const def = state.scene.def;
    const legend = Object.assign({}, window.LIFE_DATA.scenes.legend || {}, def.legend || {});
    canvas.width = def.map[0].length * 4; canvas.height = def.map.length * 4;
    const ctx = canvas.getContext('2d');
    const colors = { path:'#d8b47d', water:'#659ea7', shore:'#b4c38e', roof:'#ab6750', roofSlate:'#6c8290', roofMoss:'#839263',
      wall:'#ddcda3', floor:'#c8a26e', iwall:'#786651', asphalt:'#96968a', soil:'#9b7750', bridge:'#bb986a', yard:'#a5a28e' };
    def.map.forEach(function (line, y) { Array.from(line).forEach(function (_, x) {
      const s = terrain(def, legend, x, y);
      ctx.fillStyle = s.entity === 'tree' ? '#4d7853' : colors[s.tile] || '#99b975';
      ctx.fillRect(x * 4, y * 4, 4, 4);
    }); });
    state.scene.interactZones.forEach(function (z) {
      if(z.ent && z.ent.hidden || window.GameKeepsakes && !window.GameKeepsakes.available(z,state)) return;
      ctx.fillStyle = z.memoryId && state.discovered.has(z.memoryId) ? '#547855' : '#ffe4a1';
      ctx.fillRect(z.cx / T * 4 - 1, z.cy / T * 4 - 1, 3, 3);
    });
    const goal=window.GameStory && window.GameStory.target(state);
    const point=goal && (goal.sceneId===state.scene.id ? goal : state.scene.id==='village' ? goal.entry : null);
    if(point) {ctx.strokeStyle='#ffcd4b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(point.x/T*4,point.y/T*4,5,0,Math.PI*2);ctx.stroke();}
    const x = state.player.x / T * 4, y = state.player.y / T * 4;
    ctx.fillStyle = '#563a35'; ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = '#fff8e3'; ctx.fillRect(x - 2, y - 2, 5, 5);
    ctx.fillStyle = '#c65b45'; ctx.fillRect(x - 1, y - 1, 3, 3);
  }
  return { decorate, shadows, light, map, daylight, nightAmount, lights };
})();
