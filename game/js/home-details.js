// Original, non-colliding domestic details. Draw in scene coordinates around existing furniture.
window.LGHomeDetails=(function(){
  'use strict';
  const T=16;
  function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),w,h);}
  function draw(ctx,state,layer){
    const room=state.scene && state.scene.def, d=room && room.details;
    if(!d) return;
    ctx.save();
    const [entryX,entryY]=d.entry, [bedX,bedY]=d.bed;
    if(layer==='ground'){
      // Full-height wooden screens visibly match the solid partition cells.
      room.map.forEach((line,y)=>Array.from(line).forEach((ch,x)=>{
        if(ch!=='|')return;
        rect(ctx,x*T,y*T,T,T,'#70553e');
        rect(ctx,x*T+2,y*T,12,T,d.colors);
        for(let dx=4;dx<14;dx+=4)rect(ctx,x*T+dx,y*T,1,T,'#dac49b');
        rect(ctx,x*T,y*T+14,T,2,'#554633');
      }));
      // Doormat and a pair of shoes beside the entry, away from the walking corridor.
      rect(ctx,entryX*T-5,entryY*T+7,25,7,'#a28b68');
      rect(ctx,entryX*T-3,entryY*T+8,21,1,'#d4bd8b');
      rect(ctx,(entryX-2)*T+4,entryY*T+7,4,6,'#5b5148');
      rect(ctx,(entryX-2)*T+10,entryY*T+7,4,6,'#5b5148');
      // A bedside runner makes the bedroom distinct without blocking its opening.
      rect(ctx,bedX*T-1,(bedY+1)*T+2,20,9,d.colors);
      rect(ctx,bedX*T+1,(bedY+1)*T+4,16,1,'#dfc99d');
      if(d.theme===3 || d.theme===1){
        const [x,y]=d.feature;
        // Sawdust and unfinished planks make the carpenter recognizable immediately.
        for(let i=0;i<16;i++)rect(ctx,x*T-12+(i*7)%34,(y+1)*T+(i*3)%13,2,1,'#dfbf83');
        rect(ctx,(x-2)*T,(y+2)*T,23,4,'#bc8e5b');rect(ctx,(x-2)*T+2,(y+2)*T+1,18,1,'#e1b97b');
        rect(ctx,(x-2)*T+5,(y+2)*T+6,20,3,'#a8794d');
      }
    }else if(layer==='top'){
      const [tx,ty]=d.table, [kx,ky]=d.kitchen;
      // A kettle, chopping board, stacked bowls and chopsticks at the kitchen counter.
      rect(ctx,kx*T-4,ky*T-4,5,3,'#eee0b6');rect(ctx,kx*T-3,ky*T-3,3,1,'#b59c76');
      rect(ctx,kx*T+7,ky*T-3,6,3,'#666c61');rect(ctx,kx*T+9,ky*T-5,3,2,'#858c7b');
      rect(ctx,tx*T+3,ty*T-3,6,4,'#ece1ba');rect(ctx,tx*T+4,ty*T-2,4,2,'#c6a476');
      rect(ctx,tx*T+11,ty*T-3,1,6,'#6b5038');rect(ctx,tx*T+13,ty*T-3,1,6,'#6b5038');
      // Laundry above the sleeping nook: cloth colors vary from home to home.
      const laundryX=d.left?T+4:(room.map[0].length-5)*T;
      rect(ctx,laundryX,13,39,1,'#6e5842');
      ['#c9d4bb',d.colors,'#d5ba82'].forEach((color,i)=>{
        const x=laundryX+3+i*12;rect(ctx,x,14,8,8,color);rect(ctx,x+2,22,2,2,color);
        rect(ctx,x+4,12,1,3,'#866443');
      });
      // Wall pictures, mail and occupational tools are deliberately placed above head height.
      const wx=Math.floor(room.map[0].length/2)*T+4;
      rect(ctx,wx,5,12,9,'#78553d');rect(ctx,wx+2,6,8,6,d.theme%2?'#c8d0a9':'#b4c4ca');
      if(d.theme===3){
        const [x,y]=d.feature;
        rect(ctx,x*T-7,y*T-20,23,8,'#8c6747');
        for(let i=0;i<3;i++){rect(ctx,x*T-4+i*7,y*T-19,2,5,'#b6c0b6');rect(ctx,x*T-5+i*7,y*T-15,4,2,'#d3a76e');}
        // Unfinished chair frame, clearly different from finished household seating.
        rect(ctx,(x+1)*T+4,(y+1)*T+1,2,13,'#ba925e');rect(ctx,(x+1)*T+13,(y+1)*T+1,2,13,'#ba925e');
        rect(ctx,(x+1)*T+4,(y+1)*T+3,11,2,'#d3ae78');rect(ctx,(x+1)*T+4,(y+1)*T+9,11,2,'#d3ae78');
      }else if([2,6,13].includes(d.theme)){
        const [x,y]=d.feature;
        rect(ctx,x*T-4,y*T-1,8,5,'#f0e2bd');rect(ctx,x*T+5,y*T,6,4,'#e5d4a9');
        rect(ctx,x*T-2,y*T+1,4,1,'#8b816a');
      }else if([0,5,10,12].includes(d.theme)){
        const [x,y]=d.feature;
        for(let i=0;i<3;i++){rect(ctx,x*T-9+i*8,y*T-5,5,5,'#af7451');rect(ctx,x*T-8+i*8,y*T-8,3,4,'#6c9455');}
      }
    }
    ctx.restore();
  }
  return {draw};
})();
