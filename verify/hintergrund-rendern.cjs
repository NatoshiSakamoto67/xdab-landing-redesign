const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:960,height:540}});
  await p.setContent('<body style="margin:0;background:#0f0f11"><canvas id="c" width="3840" height="2160"></canvas></body>');
  console.log('rendere 3840x2160 …');
  await p.evaluate(()=>{
    const c=document.getElementById('c'), x=c.getContext('2d'), W=c.width, H=c.height;
    const bild=x.createImageData(W,H), d=bild.data;

    // Gesaetes Gitterrauschen mit weicher Interpolation -> fliessendes Gelaende
    function saat(i,j,o){ const s=Math.sin(i*127.1+j*311.7+o*74.7)*43758.5453; return s-Math.floor(s); }
    function glatt(t){ return t*t*(3-2*t); }
    function schicht(u,v,gx,gy,o){
      const fx=u*gx, fy=v*gy, ix=Math.floor(fx), iy=Math.floor(fy);
      const tx=glatt(fx-ix), ty=glatt(fy-iy);
      const a=saat(ix,iy,o), bb=saat(ix+1,iy,o), cc=saat(ix,iy+1,o), dd=saat(ix+1,iy+1,o);
      return (a+(bb-a)*tx) + ((cc+(dd-cc)*tx) - (a+(bb-a)*tx))*ty;
    }
    function gelaende(u,v){
      return schicht(u,v,5,3,1)*0.74 + schicht(u,v,11,6,2)*0.20
           + schicht(u,v,23,13,3)*0.06;
    }

    const BAENDER=21;
    for(let y=0;y<H;y++){
      const v=y/H;
      for(let xx=0;xx<W;xx++){
        const u=xx/W;
        const h=gelaende(u,v);
        const band=h*BAENDER, dist=Math.abs(band-Math.round(band));
        // Zwei Anteile: ein scharfer Kern (echte Haarlinie) und eine weite Glut.
        // Nur so wirkt es bei 4K wirklich scharf statt nur weich leuchtend.
        const kern=Math.pow(Math.max(0,1-dist*90),1.1);
        const glut=Math.pow(Math.max(0,1-dist*14),3.0);
        const staerke=Math.min(1,kern*0.95+glut*0.42);
        const t=Math.min(1,Math.max(0,h));
        const r=17+staerke*(20+t*26), g=19+staerke*(104+t*86), bl=22+staerke*(94+t*56);
        const vign=1-Math.pow(Math.hypot(u-0.5,v-0.5)*1.36,2.2);
        const f=Math.max(0,Math.min(1,vign))*(1-v*0.18);
        const i=(y*W+xx)*4;
        d[i]=Math.round(15+(r-15)*f); d[i+1]=Math.round(15+(g-15)*f);
        d[i+2]=Math.round(17+(bl-17)*f); d[i+3]=255;
      }
    }
    x.putImageData(bild,0,0);
  });
  const daten=await p.evaluate(()=>document.getElementById('c').toDataURL('image/png'));
  require('fs').writeFileSync('/tmp/hg-4k.png', Buffer.from(daten.split(',')[1],'base64'));
  await b.close(); console.log('fertig');
})();
