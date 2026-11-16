// Cached, original pixel details for the village's four recognizable neighborhoods.
window.LGVillageDetails=(function(){
  'use strict';
  const T=16;
  function box(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h);}
  function decorate(g,def,legend,pad){
    if(def.id!=='village' || !def.districts)return;
    g.save();g.translate(pad,pad);
    // Worn stone seams and moss distinguish the old lanes from dirt tracks.
    def.map.forEach((row,y)=>Array.from(row).forEach((ch,x)=>{
      if(ch!=='j')return;
      const px=x*T,py=y*T;
      box(g,px+1,py+1,14,7,(x+y)%2?'#a5a28e':'#aaa791');
      box(g,px+1,py+9,14,6,'#969983');
      box(g,px+6,py+1,1,6,'#7e8776');box(g,px+11,py+9,1,6,'#7e8776');
      if((x*3+y)%5===0){box(g,px,py+7,4,2,'#76875c');box(g,px+12,py+15,3,1,'#76875c');}
    }));
    // Vegetable leaves line the new beds while earthen paths stay fully visible.
    for(const start of [3,9])for(let y=21;y<23;y++)for(let x=start;x<start+4;x++){
      for(const dx of [4,11]){
        const px=x*T+dx,py=y*T+7;
        box(g,px,py,1,5,'#557744');box(g,px-3,py-1,3,2,'#93ad61');
        box(g,px+1,py-2,3,2,'#75984f');box(g,px-1,py-4,2,4,'#a7bd72');
      }
    }
    // Stone well: its complete 2x2 footprint is solid in the map legend.
    const wx=12*T,wy=37*T;
    box(g,wx,wy+8,32,23,'#666e68');box(g,wx+2,wy+10,28,18,'#969b89');
    box(g,wx+5,wy+12,22,9,'#313f41');box(g,wx+7,wy+14,18,5,'#527780');
    box(g,wx+1,wy+8,30,4,'#bdbea5');box(g,wx+3,wy+24,26,1,'#707c70');
    box(g,wx+2,wy+2,3,14,'#72563c');box(g,wx+27,wy+2,3,14,'#72563c');
    box(g,wx+2,wy+1,28,3,'#a27a4d');box(g,wx+15,wy+4,1,13,'#c2ad7c');
    box(g,wx+12,wy+16,7,6,'#b18a58');box(g,wx+11,wy+16,9,1,'#e0bc7f');
    // A continuous wood deck spans water, with railings alongside the real bridge tiles.
    const bx=50*T,by=22*T;
    box(g,bx,by,7*T,2*T,'#a67e51');
    for(let x=bx+3;x<bx+7*T;x+=5){box(g,x,by,1,2*T,'#72583b');box(g,x+1,by+2,1,2*T-4,'#c09a65');}
    for(const yy of [by,by+2*T-2]){
      box(g,bx,yy,7*T,2,'#654c34');box(g,bx,yy-1,7*T,1,'#d0a56a');
      for(let x=bx;x<bx+7*T;x+=16)box(g,x,yy-3,3,6,'#7d5938');
    }
    // River reeds stop at the bridge so the crossing remains legible.
    for(let y=2;y<42;y+=3){
      if(y>=20 && y<=25)continue;
      const x=50*T+3,yy=y*T;
      box(g,x,yy,1,9,'#658568');box(g,x+3,yy-3,1,12,'#547855');
      box(g,x+2,yy-5,3,4,'#aa9461');box(g,x+6,yy+2,1,8,'#88a16c');
    }
    // Door-side objects vary by district rather than repeating at every house.
    for(const [i,home] of (def.homes||[]).entries()){
      const x=(home[0]-2)*T+2,y=home[1]*T+3;
      if(home[0]<16){ // Water jars and rope baskets in the old alley.
        box(g,x,y,9,9,'#8a7962');box(g,x+1,y-2,7,3,'#b8a58c');box(g,x+2,y-1,5,1,'#554c42');
        box(g,x+11,y+3,6,5,'#b48c53');box(g,x+11,y+5,6,1,'#755d3d');
      }else if(home[0]>42){ // Flower boxes beside the river-facing houses.
        box(g,x,y+4,18,5,'#98704d');
        for(let j=1;j<17;j+=4){box(g,x+j,y,2,4,'#60835a');box(g,x+j-1,y-1,3,2,i%2?'#dab48f':'#cda1ab');}
      }
    }
    // A single line of laundry makes the tight old lane recognizable from a distance.
    const lx=8*T,ly=30*T;
    box(g,lx,ly,2,18,'#71513b');box(g,lx+24,ly,2,18,'#71513b');box(g,lx,ly+1,26,1,'#ddd0ad');
    box(g,lx+4,ly+2,7,8,'#d5b690');box(g,lx+14,ly+2,6,10,'#7f9da0');
    // Quiet east-bank picnic blanket, clearly beyond the village's bridge.
    box(g,58*T,26*T,20,14,'#a77465');
    for(let y=26*T+1;y<26*T+14;y+=4)box(g,58*T+1,y,18,1,'#e0bf97');
    g.restore();
  }
  function districtAt(def,x,y){
    return (def.districts||[]).find(d=>x>=d.bounds[0]*T && y>=d.bounds[1]*T && x<(d.bounds[0]+d.bounds[2])*T && y<(d.bounds[1]+d.bounds[3])*T) || null;
  }
  return {decorate,districtAt};
})();
