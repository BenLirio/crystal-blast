
(function(){
  module = window.noise = {};

  function G(x, y, z) {
    this.x = x; this.y = y; this.z = z;
  }
  
  G.prototype.dot2 = function(x, y) {
    return this.x*x + this.y*y;
  };

  g3 = [new G(1,1,0),new G(-1,1,0),new G(1,-1,0),new G(-1,-1,0),
              new G(1,0,1),new G(-1,0,1),new G(1,0,-1),new G(-1,0,-1),
              new G(0,1,1),new G(0,-1,1),new G(0,1,-1),new G(0,-1,-1)];

  let p = [];
  while (p.length<300) {
    p.push(rint(0,255));
  }
  p = [...new Set(p)];
  // To remove the need for index wrapping, double the permutation table length
  perm = new Array(512);
  gP = new Array(512);

  // This isn't a very good seeding function, but it works ok. It supports 2^16
  // different seed values. Write something better if you need more seeds.
  module.seed = function(seed) {
    if(seed > 0 && seed < 1) {
      // Scale the seed out
      seed *= 65536;
    }

    seed = Math.floor(seed);
    if(seed < 256) {
      seed |= seed << 8;
    }

    for( i = 0; i < 256; i++) {
      v=0;
      if (i & 1) {
        v = p[i] ^ (seed & 255);
      } else {
        v = p[i] ^ ((seed>>8) & 255);
      }

      perm[i] = perm[i + 256] = v;
      gP[i] = gP[i + 256] = g3[v % 12];
    }
  };

  module.seed(0);

  // ##### Perlin noise stuff

  function fade(t) {
    return t*t*t*(t*(t*6-15)+10);
  }

  function lerp(a, bs, t) {
    return (1-t)*a + t*bs;
  }

  // 2D Perlin Noise
  module.perlin2 = function(x, y) {
    // Find unit grid cell containing point
    X = Math.floor(x), Y = Math.floor(y);
    // Get relative xy coordinates of point within that cell
    x = x - X; y = y - Y;
    // Wrap the integer cells at 255 (smaller integer period can be introduced here)
    X = X & 255; Y = Y & 255;

    // Calculate noise contributions from each of the four corners
    n00 = gP[X+perm[Y]].dot2(x, y);
    n01 = gP[X+perm[Y+1]].dot2(x, y-1);
    n10 = gP[X+1+perm[Y]].dot2(x-1, y);
    n11 = gP[X+1+perm[Y+1]].dot2(x-1, y-1);

    // Compute the fade curve value for x
    u = fade(x);

    // Interpolate the four results
    return lerp(
        lerp(n00, n10, u),
        lerp(n01, n11, u),
      fade(y));
  };

})(this);

(function() {

  Cam = function(context, settings) {
    settings = settings || {};
    let t = this;
    t.d = 1000.0;
    t.la = [0,0];
    t.context = context;
    t.fieldOfView = settings.fieldOfView || Math.PI / 4.0;
    t.vp = {
      lf: 0,
      rt: 0,
      tp: 0,
      bottom: 0,
      w: 0,
      h: 0,
      scale: [1.0, 1.0]
    };
    t.updatevp();
  };

  Cam.prototype = {
    begin: function() {
      let t = this;
      t.context.save();
      t.applyScale();
      t.applyTranslation();
    },
    end: function() {
      this.context.restore();
    },
    applyScale: function() {
      this.context.scale(this.vp.scale[0], this.vp.scale[1]);
    },
    applyTranslation: function() {
      this.context.translate(-this.vp.lf, -this.vp.tp);
    },
    updatevp: function() {
      let t = this;
      t.aspectRatio = t.context.canvas.width / t.context.canvas.height;
      t.vp.w = t.d * Math.tan(t.fieldOfView);
      t.vp.h = t.vp.w / t.aspectRatio;
      t.vp.lf = t.la[0] - (t.vp.w / 2.0);
      t.vp.tp = t.la[1] - (t.vp.h / 2.0);
      t.vp.rt = t.vp.lf + t.vp.w;
      t.vp.bottom = t.vp.tp + t.vp.h;
      t.vp.scale[0] = t.context.canvas.width / t.vp.w;
      t.vp.scale[1] = t.context.canvas.height / t.vp.h;
    },
    zoomTo: function(z) {
      this.d = z;
      this.updatevp();
    },
    moveTo: function(x, y) {
      let t = this;
      t.la[0] = x;
      t.la[1] = y;
      t.updatevp();
    }
  };

  this.Cam = Cam;
  
}).call(this);

let a = document.getElementById("a");
let w=a.width;
let h=a.height;
let mapw=40*2;
let maph=(32 * 3)+6;
let ctx=a.getContext('2d');
let camera=new Cam(ctx);
let players = [];
let gravity=0.2;
let screen=1;
let k=[];//inpt
let bgTiles = a2(mapw, maph, null);
let tiles=a2(mapw, maph, null);
let fgTiles = a2(mapw, maph, null);
let tileSize=32;//tl size
let bgParallax = 0.25;
let spaceship = null;
let hasLaunched = false;
let clouds=[];
let mobs=[];
let parts=[];
let projs=[];
let spawnDelay=300;
let spawnTick=0;
let spawnCloudDelay = 60;
let spawnCloudTick = 0;
let hasMovedAround = false;
let movedTick = 0;
let mapPreviewMode = false;
let n=noise;
let mseed=rint(0,6000);
let seeds=[];
for ( i=0;i<10;i++) {
  seeds.push(rint(0,6000));
}
noise.seed(mseed);

let ir='images/';

let log=lc('log');
let leaves=lc('leaves');
let cactus=lc('cactus');
let grass=lc('grass');
let dirt=lc('dirt');
let rock = lc('rock', 4);
let rockblue=lc('rockblue');
let oiron=lc('oiron');
let lavarock=lc('lavarock');
let bedrock=lc('bedrock');
let ladder=lc('ladder');
let lava=lc('lava');
let ecrystal=lc('ecrystal');
let bg_rocks = lc('bg_rock', 4);
let bg_lavarock=lc('bg_lavarock');
let bg_stars=lc('bg_stars');
let hit=lc('hit');
let spcship=lc('spcship');
let player=lc('player','.gif');
let player_drilling=lc('playerdown');
let plasmaball=lc('plasmaball');
let oortbug=lc('oortbug');
let slugger=lc('slugger');
let heart=lc('heart');
let heartempty=lc('heartempty');
let lifecanister=lc('lifecanister');
let cloud_imgs = lc('cloud', 1);

let wldts = [
  {
    name: "grass",
    rockIndex: 0,
    hasGrass: true,
    hasDirt: true,
    hasSky: true
  },
  {
    name: "blue",
    rockIndex: 1,
    hasGrass: !rint(0, 1),
    hasDirt: !rint(0, 1),
    hasSky: true
  },
  {
    name: "sand",
    rockIndex: 2,
    hasGrass: !1,
    hasDirt: !1,
    hasSky: true
  },
  {
    name: "wasteland",
    rockIndex: 3,
    hasGrass: !1,
    hasSky: true
  }
];
wldt = wldts[rint(0, wldts.length - 1)];  
function getRandomHex() {
  let chars = [1,2,3,4,5,6,7,8,9,"A","B","C","D","E","F"];
  let code = "#";
  for ( i = 0; i < 6; i++) {
    code += chars[rint(0, chars.length - 1)];
  }
  return code;
}
wldt.skyColor = getRandomHex();

function distance(x1, y1, x2, y2){
  let a = x1 - x2;
  let b = y1 - y2;
  
  return Math.hypot(a, b);
}

function clamp(val, min, max) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

function rint(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function withinCamLoop(snc, callback) {
  for ( xp = snc.lf - 2; xp < snc.lf + snc.w + 2; xp++) {
    for ( yp = snc.tp - 2; yp < snc.tp + snc.h + 2; yp++) {

      if (tileWithinMap(xp, yp)) {

        callback(xp, yp);

      }
    }
  }
}

function tileWithinMap(x, y) {
  if (x >= 0 && x < mapw &&
      y >= 0 && y < maph) {
    
    return true;
  }
  return false;
}


function colCheck(shapeA, shapeB) {
  
  // get the vectors to check against
  vX = (shapeA.x + (shapeA.w / 2)) - (shapeB.x + (shapeB.w / 2)),
      vY = (shapeA.y + (shapeA.h / 2)) - (shapeB.y + (shapeB.h / 2)),
      // add the half widths and half heights of the objects
      hWidths = (shapeA.w / 2) + (shapeB.w / 2),
      hHeights = (shapeA.h / 2) + (shapeB.h / 2),
      cold = null;
  // if the x and y vector are less than the half w or half h, they we must be inside the object, causing a collision
  if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
      // figures out on which side we are colliding (tp, bottom, lf, or rt)
      oX = hWidths - Math.abs(vX),
          oY = hHeights - Math.abs(vY);
      if (oX >= oY) {
          if (vY > 0) {
            if (shapeA.vy < 10) {
                cold = "t";
                shapeA.y += oY;
            }
            else {
              if (vX > 0) {
                cold = "l";
                shapeA.x += oX;
              } else {
                cold = "r";
                shapeA.x -= oX;
              }
            }
          } else {
              cold = "bs";
              shapeA.y -= oY;
          }
      } else {
          if (vX > 0) {
              cold = "l";
              shapeA.x += oX;
          } else {
              cold = "r";
              shapeA.x -= oX;
          }
      }
  }
  return cold;
}

function colRect(rect1, rect2) {
  if (rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.w > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.y + rect1.h > rect2.y) {
      // collision detected!
      return true;
  }
  return false;
}

function sgf(value, cellSize) {
  return Math.floor(value / cellSize) * cellSize;
}

function isTileAbove(xp, yp) {
  for ( y = yp - 1; y > 0; y--) {
    if (tiles[xp][y]) {
      return true;
    }
  }
  return false;
}

function getTileType(tl) {
  let type = null;

  for ( i = 0; i < rock.length; i++) {
    if (tl.i == rock[i]) {
      type = "rock";
    }
  }

  return type;
}

function makeTree(x, y, logType, height, hasLeaves, args) {

  let top = y - height;
  let rad = rint(3, 5);

  for (ly = y; ly > top; ly--) {
    if (tileWithinMap(x, ly)) {
      tiles[x][ly] = new Tile(x*tileSize,ly*tileSize,logType,args);

      if (ly == top + 1 && hasLeaves) {
        for ( xp = -rad; xp < rad; xp++) {
          for ( yp = -rad; yp < rad; yp++) {
            if ((xp * xp) + (yp * yp) < Math.pow(rad, 2)) {
              if (tileWithinMap(x+xp, y+yp)) {
                tiles[x+xp][ly+yp] = new Tile((x+xp)*tileSize,(ly+yp)*tileSize,leaves,args);
              }
            }
          }
        }
      }
    }
  }
}

class Anim {
  constructor(amtF,f,d) {
    let t = this;
    t.amtF=amtF;
    t.f=f;
    t.t=0;
    t.d=d;
    t.on=!0;
  }
  ud(){
    let t = this;
    if (t.on) {
      if(t.t<t.d){
        t.t++;
      }
      else {
        if(t.f<t.amtF-1){
          t.f++;
        }
        else{
          t.f=0;
        }
        t.t=0;
      }
    }
  }
}

class Tile {
  constructor(x,y,i,args){
    args=args||{
      canFlip:true,
      destructible:true,
      collidable:true,
      damage: null
    };
    let t = this;
    t.x=x;
    t.y=y;
    t.i=i;
    t.w=tileSize;
    t.h=tileSize;
    t.hf=0; // horizontal flip
    t.vf=0; // vertical flip
    t.collidable=args.collidable;
    t.destructible=args.destructible;
    t.damage=args.damage;
    t.elapsed = 1;
    if (args.canFlip) {
      t.hf=rint(0,1);
      t.vf=rint(0,1);
    }
    t.iVis=!0;//img visible
    t.rVis=!1;//rect visible
    t.rCol='#000';
    t.dmg = 0;
  }
  hit(amt, d) {
    let t = this;
    if (t.dmg < 1 && t.destructible) {
      t.dmg += amt;

      let y = rint(t.y - 2, t.y + t.h + 2);
      let vy = 0;

      if (d == 'bs') {
        y = t.y - 2;
        vy = -rint(1, 3);
      }

      if (rint(0, 100) > 80) {
        let part = new Part(
          rint(t.x - 2, t.x + t.w + 2),
          y,
          4,
          4,
          this.i
        );
        part.vy = vy;

        parts.push(part);
      }
    }
  }
  ud() {
    let t = this;
    
    t.elapsed++;
  }
  draw(ctx){
    let t = this;
    if (t.iVis && !t.rVis) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(!t.hf?1:-1, !t.vf?1:-1);
      ctx.drawImage(t.i, -Math.sign(t.hf)*t.w, -Math.sign(t.vf)*t.h, t.w, t.h);
      ctx.restore();
    }
    //drawImage(this.i,this.x,this.y, 1, this.r);

    if (t.rVis && !t.isVis) {
      ctx.save();
      ctx.fillStyle = t.rCol;
      ctx.fillRect(t.x,t.y,t.w,t.h);
      ctx.strokeStyle=t.rCol;
      ctx.strokeRect(t.x,t.y,t.w,t.h);
      ctx.restore();
    }

    if (t.dmg > 0) {
      ctx.save();
      ctx.fillStyle = t.rCol;
      ctx.globalAlpha = t.dmg * 0.65;
      ctx.fillRect(t.x,t.y,t.w,t.h);
      ctx.strokeStyle = t.rCol;
      ctx.strokeRect(t.x,t.y,t.w,t.h);
      ctx.restore();
    }
  }
}

class E {
  constructor(x,y) {
    let t = this;
    t.x=x;
    t.y=y;
    t.ax = 0;
    t.ay = 0;
    t.vx = 0;
    t.vy = 0;
    t.hp=1;
    t.despawnDelay = 60 * 10; 
    t.despawnTick = 0;
  }

  getTile(arr) {

    let tl = null;

    let x = sgf(this.x, tileSize) / tileSize;
    let y = sgf(this.y, tileSize) / tileSize;
  
    if (tileWithinMap(x, y)) {
      tl = arr[x][y];
    }

    return tl;
  }

  getTilePos() {

    let x = sgf(this.x, tileSize) / tileSize;
    let y = sgf(this.y, tileSize) / tileSize;

    return {x:x,y:y};
  }
}

class Cloud extends E {
  constructor(x,y,w,h,i) {
    super(x, y);
    let t = this;
    t.i = i;
    t.w = w;
    t.h = h;
    t.vx = -rint(0.1, 2);
    t.canDestroy = !1;
  }

  ud() {
    let t = this;
    t.x += t.vx;
    t.y += t.vy;
  }

  draw(ctx) {
    let t = this;
    ctx.drawImage(t.i, t.x, t.y, t.w, t.h);
  }
}

class Part extends E {
  constructor(x,y,w,h,i,col) {
    super(x, y);
    let t=this;
    t.i=i;
    t.col = col;
    t.w=w;
    t.h=h;
    t.delay = 90;
    t.tick = 0;
    t.gnd=!1;
    t.useGravity = !0;
    t.canDestroy = !1;
  }

  owc(d) {
  }

  ud() {
    let t=this;

    if (t.tick < t.delay) {
      t.tick++;
    }
    else {
      t.canDestroy = true;
    }

    if (t.gnd) {
      t.vy = 0;
    }

    if (t.useGravity && t.vy < 10) {
      t.vy += gravity;
    }

    t.x += t.vx;
    t.y += t.vy;
  }

  draw(ctx) {
    let t = this;

    if (t.col) {
      ctx.save();
      ctx.fillStyle = t.col;
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.restore();
    }
    else {
      ctx.drawImage(t.i, t.x, t.y, t.w, t.h);
    }
  }
}

class P extends E {
  constructor(x,y,i) {
    super(x, y);
    let t=this;
    t.i=i;
    t.w=10;
    t.h=14;
    t.spd=1;
    t.vx=0;
    t.vy=0;
    t.fric = 0.8;
    t.jmp=!1;
    t.gnd=!1;
    t.dsh=!1;
    t.drlg=!1;
    t.fc = "R";
    t.vxm=1; // velocity multiplier
    t.sd=99999;
    t.st=0;
    t.ecrystal=0;
    t.ammo=0;
    t.iron=0;
    t.maxhp=3;
    t.hp=3;
    t.dead=false;
    t.invinc=!1;
    t.invincTick=0;
    t.invincDelay=120;
    t.visible=true;
    t.cheatmode=!1;
    t.anim=new Anim(2,0,8);
  }

  damage(amt) {
    let t = this;

    if (!t.invinc && !hasLaunched) {
      if (t.hp - amt > 0) {
        t.hp -= amt;
      }
      else {
        t.hp = 0;
        t.dead = true;
      }

      t.invincTick = 0;
      t.invinc = true;
    }

  }

  ud() {
    let t=this;
    
    if (!t.cheatmode) {

      if (t.gnd) {
        t.vy = 0;
      }

      if (t.dsh) {
        t.vxm=2;
        t.anim.d=4;
      }
      else {
        t.vxm=1;
        t.anim.d=8;
      }

      t.vx *= t.fric;
      if (t.vy < 10) {
        t.vy += gravity;
      }

      if (Math.abs(t.vx) < 0.1 ) {
        t.anim.on=!1;
      }
      else if (t.vx >= 0.5 || t.vx <= -0.5) {
        t.anim.on=!0;
      }
    }
    else {
      t.vx *= t.fric;
      t.vy *= t.fric;
    }

    if (hasLaunched) {
      t.vx = 0;
      t.vy = 0;
    }

    t.x += t.vx;
    t.y += t.vy;

    t.anim.ud();

    if (t.invinc) {
      if (t.invincTick < t.invincDelay) {
        t.invincTick++;

        t.visible=!t.visible;
      }
      else {
        t.invinc = false;
        t.visible = true;

        t.invincTick = 0;
      }
    }

    if (t.dead) {
      t.visible = false;
    }

    /*
    if (t.x >= w-t.i.w) {
      t.x = w-t.i.w;
    }
    else if (this.x <= 0) {
      this.x = 0;
    }

    if (this.y >= h-this.i.h) {
      this.y = h-this.i.h;
      this.jmp = !1;
    }*/

  }

  draw(ctx) {

    let t = this;

    //drawImage(this.i,this.x,this.y,1,this.r);
    ctx.save();

    let overrideDraw = !1;

    if (t.drlg) {
      overrideDraw = !0;
    }

    if (!overrideDraw && t.visible) {
      if (t.fc == 'L') {

        ctx.translate(t.x, t.y);
        ctx.scale(-1, 1);
        ctx.drawImage(t.i, t.anim.f*10,0,10,16,-10, 0,10,16);
      }
      else if (t.fc == 'R') {
        ctx.drawImage(t.i, t.anim.f*10,0,10,16,t.x, t.y, 10, 16);
      }
    }
    else {
      if (t.drlg && t.idrlg !== undefined && !hasLaunched) {
        ctx.drawImage(t.idrlg, t.x, t.y);
      }
    }

    ctx.restore();
  }
}

class Proj extends E {
  constructor(x,y,i,vx,vy,friendly) {
    super(x,y);
    let t = this;
    t.i=i;
    t.w=i.width;
    t.h=i.height;
    t.vx=vx;
    t.vy=vy;
    t.friendly=friendly;
  }

  ud(){
    let t = this;

    t.x += t.vx;
    t.y += t.vy;
  }

  draw(ctx){
    let t = this;
    ctx.drawImage(t.i, t.x, t.y);
  }
}

class Spaceship extends E {
  constructor(x, y, w, h, i) {
    super(x, y);
    let t = this;
    t.w = w;
    t.h = h;
    t.i = i;
  }

  ud() {
    let t = this;
    t.vx += t.ax;
    t.vy += t.ay;

    t.x += t.vx;
    t.y += t.vy;
  }

  draw(ctx) {
    let t = this;
      ctx.drawImage(t.i, t.x, t.y, t.w, t.h);
  }
}

class GroundMob extends E {
  constructor(x,y,w,h,i,isAnim, mf, fd=30) {
    super(x,y);
    let t = this;
    t.i=i;
    t.w=w;
    t.h=h;
    t.isAnim=isAnim;
    t.frame=0;
    t.mf=mf;
    t.fd=fd;
    t.ft=0;
    t.fc="R";
    t.gnd=!1;
    t.jmp=!1;
    t.vx=0;
    t.vy=0;
    t.fr=0;
  }

  baseupdate(){
    let t = this;

    if (t.gnd) {
      t.vy = 0;
    }

    if (t.vy < 10) {
      t.vy += gravity;
    }

    t.x += t.vx;
    t.y += t.vy;


    if (t.ft < t.fd) {
      t.ft++;
    }
    else {
      if (t.frame < t.mf - 1) {
        t.frame++;
      }
      else {
        t.frame = 0;
      }

      t.ft=0;
    }

  }

  draw(ctx) {
    let t = this;

    ctx.save();

    if (t.fr) {
      ctx.filter = t.fr;
    }

    if (t.fc == 'R') {

      ctx.translate(t.x, t.y);
      ctx.scale(-1, 1);
      if (t.isAnim) {
        ctx.drawImage(t.i, t.frame * t.w, 0, t.w, t.h, -16, 0, t.w, t.h);
      }
      else {
        ctx.drawImage(t.i, -10, 0, t.w, t.h);
      }
    }
    else if (t.fc == 'L') {
      if (t.isAnim) {
        ctx.drawImage(t.i, t.frame * t.w, 0, t.w, t.h, t.x, t.y, t.w, t.h);
      }
      else {
        ctx.drawImage(t.i, t.x, t.y, t.w, t.h);
      }
    }
    ctx.restore();
  }
}

class OortBug extends GroundMob {
  constructor(x,y,w,h,i) {
    super(x,y,w,h,i,!0,2,4);
    let t = this;
    t.vx = rint(0,10) > 1 ? -1 : 1;
    if (Math.sign(this.vx) == 1) {
      t.fc = "R";
    }
    else {
      t.fc = "L";
    }
    t.fr=rint(0,1)?'hue-rotate('+rint(0,360)+'deg)':0;
  }

  ud() {
    this.baseupdate();
  }

  owc(d) {
    let t = this;

    t.vx = -t.vx;

    t.vy = -4;
    t.jmp = !0;
    t.gnd = !1;

    if (d == 'l') {
      t.fc = 'R';
    }
    else {
      t.fc = 'L';
    }
  }
}

function a2(numrows, numcols, initial)
{
  arr = [];
  for ( i = 0; i < numrows; ++i)
  {
    columns = [];
    for ( j = 0; j < numcols; ++j)
    {
      columns[j] = initial;
    }
    arr[i] = columns;
  }
  return arr;
}

function lc(fn,amt=0) {
  c=0;
  if (amt>0) {
    c=[];
    for( i=0;i<amt;i++){
      im=new Image();
      im.src=ir+fn+i+'.gif';
      c.push(im);
    }
    return c;
  }
  else {
    c=new Image();
    c.src=ir+fn+'.gif';
  }
  return c;
}

function init(){

  ctx.msImageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

  switch(screen) {
    case 0: {
      
      break;
    }
    case 1: {

      if (mapPreviewMode) {
        camera.zoomTo(5000);
        camera.moveTo((mapw * tileSize)/2, (maph * tileSize)/2);
      }
      else {
        camera.zoomTo(300);
      }

      let surfaceLocations = [];
      let floorLocations = [];

      let terrainDivisor = rint(10, 200);
      let terrainAmplifier = rint(50, 500);

      for(xp=0;xp<bgTiles.length;xp++) {
        let prln=Math.floor((maph * 0.25) + Math.pow(noise.perlin2(xp/terrainDivisor, 0), 2) * terrainAmplifier);

        for(yp=prln;yp<maph;yp++){

          canAdd=!0;

          texture = bg_rocks[wldt.rockIndex];

          if (yp > maph-(maph/4)) {
            texture = bg_lavarock;
          }
          
          if (canAdd) {
            bgTiles[xp][yp] = new Tile(xp*tileSize,yp*tileSize,texture,0);
          }

        }
      }

      for (let xp=0;xp<mapw;xp++) {
        let prln=Math.floor((maph * 0.25) + Math.pow(noise.perlin2(xp/terrainDivisor, 0), 2) * terrainAmplifier);

        for (let yp=prln;yp<maph+6;yp++) {

          let canAdd=!0;
          let d=10;
          let d2=20;
          let d3=20;
          let texture = rock[wldt.rockIndex];
          let args = {
            canFlip:true,
            destructible:true,
            collidable:true,
            damage:null
          };

          if (yp < prln + 6) {
            if (wldt.hasDirt) {
              texture = dirt;
            }

            if (yp == prln && wldt.hasGrass) {
              texture = grass;
              args.canFlip = false;

              if (rint(0, 100) > 80) {
                makeTree(xp, yp, log, rint(8, 12), true);
              }
            }

            if (yp == prln) {
              if (texture == rock[2]) {
                if (rint(0, 100) > 80) {
                  makeTree(xp, yp, cactus, rint(2, 6), false);
                }
              }
            }

            if (yp == prln) {
              if (tileWithinMap(xp, yp - 1)) {
                if (!tiles[xp][yp - 1]) {
                  surfaceLocations.push({ x: xp, y: yp - 1 });
                }
              }
            }
          }

          if (yp > maph-(maph/4)) {
            texture = lavarock;
          }

          noise.seed(seeds[0]);
          p2 = noise.perlin2(xp/d2, yp/d2);

          if (p2 > 0.05 && p2 < 0.2) {
            texture = rockblue;

            if (yp > maph-(maph/4)) {
              texture = lava;
              args.destructible=false;
              args.collidable=false;
              args.damage=3;
            }
          }

          noise.seed(seeds[1]);
          p3 = noise.perlin2(xp/d3, yp/d3);
          if (p3 > 0.025 && p3 < 0.3) {
            texture = oiron;
            args.collidable=true;
            args.destructible=true;
          }

          noise.seed(mseed);

          if (yp > prln+(Math.random()*5)+3 && noise.perlin2(xp/d,yp/d) > 0.1) {
            canAdd = false;
          }
          
          if (canAdd) {
            tl=new Tile(xp*tileSize,yp*tileSize,texture,args);
            tiles[xp][yp] = tl;

            if (tileWithinMap(xp, yp - 1)) {
              if (!tiles[xp][yp - 1]) {
                floorLocations.push({ x: xp, y: yp - 1 });
              }
            }
          }

          if (yp > maph - rint(6,8)) {
            tiles[xp][yp] = new Tile(xp*tileSize,yp*tileSize,bedrock,{
              canFlip:!0,
              destructible:false,
              collidable:!0
            });
          }
        }
      }

      let solidNoFlipArgs = {
        canFlip: false,
        destructible: true,
        collidable: true
      };

      for ( i = 0; i < 9; i++) {
        let crystalLocIndex = rint(0,floorLocations.length - 1);
        let loc = floorLocations[crystalLocIndex];
        floorLocations.splice(crystalLocIndex, 1);

        tiles[loc.x][loc.y] = new Tile(loc.x*tileSize,loc.y*tileSize,ecrystal,solidNoFlipArgs);
      }
      
      for ( i = 0; i < 5; i++) {
        let canisterLoc = floorLocations[rint(0,floorLocations.length - 1)];
        
        tiles[canisterLoc.x][canisterLoc.y] = new Tile(canisterLoc.x*tileSize,canisterLoc.y*tileSize,lifecanister,solidNoFlipArgs);
      }


      let spcshipx = Math.floor(mapw/2);

      if (!mapPreviewMode) {
        player = new P(spcshipx*tileSize,128,player);
        player.idrlg = player_drilling;
        players.push(player);
      }

      let sshipLocation = surfaceLocations[rint(0, surfaceLocations.length - 1)];

      tiles[sshipLocation.x][sshipLocation.y] = new Tile(sshipLocation.x*tileSize,sshipLocation.y*tileSize,spcship,solidNoFlipArgs);

      player.x=sshipLocation.x*tileSize;
      player.y=sshipLocation.y*tileSize;

      tiles[sshipLocation.x][sshipLocation.y].destructible = false;
      tiles[sshipLocation.x][sshipLocation.y + 1].destructible = false;

      break;
    }
  }
}
function ud(){

  if (spaceship) {
    spaceship.ud();
  }

  if (players.length>0) {

    wcam = { x: camera.vp.lf, y: camera.vp.tp };
    snc = {
      lf: sgf(wcam.x, tileSize)/tileSize,
      tp: sgf(wcam.y, tileSize)/tileSize,
      w: (sgf(camera.vp.w, tileSize)/tileSize)+2,
      h: (sgf(camera.vp.h, tileSize)/tileSize)+2
    };

    let player = players[0];

    if (!player.dead) {
      if (k[90]) { // jump

        movedTick++;

        if (!player.cheatmode) {
          if (!player.jmp && player.gnd) {
            player.jmp = !0;
            player.gnd = !1;
            player.vy = -4;
          }
        }

        if (player.cheatmode) {
          if (player.vy > -player.spd) {
            player.vy--;
          }
        }
      }

      if (k[40]) { // down
        player.drlg = !0;

        movedTick++;

        if (player.cheatmode) {
          if (player.vy < player.spd) {
            player.vy++;
          }
        }

      }
      else {
        player.drlg = !1;
      }

      if (k[39]) { // right

        movedTick++;
        
        if (player.vx < player.spd * player.vxm) {
          player.vx++;
          player.fc = "R";
        }

      }

      if (k[37]) { // left

        movedTick++;

        if (player.vx > -player.spd * player.vxm) {
          player.vx--;
          player.fc = "L";
        }
      }

      if (k[88]) {

        player.dsh = true;

        movedTick++;

        if (player.st < player.sd) {
          player.st++;
        }
        else {
          if (player.ammo>0&&!player.drlg) {
            // player shoot
            let vx=0;
            if (player.fc == "L") {
              vx = -5;
            }
            else {
              vx = 5;
            }
            let proj = new Proj(player.x,player.y+7,plasmaball,vx,0,true);
            projs.push(proj);

            player.ammo--;

            player.st=0;
          }
        }
      }
      else {
        player.dsh=!1;
        player.st=player.sd-1;
      }

      if (k[38]) { // up
        let ftl = player.getTile(fgTiles);
        let tlp = player.getTilePos();

        if (ftl) {
          if (ftl.i == ladder) {
            player.vy=-2;
          }
        }

        let placey=null;
        for ( y = tlp.y; y > 0; y--) {

          if (tileWithinMap(tlp.x, tlp.y)) {
            if (tiles[tlp.x][y] == null && !placey) {
              placey=y;
            }
          }
        }

        if (placey && player.iron>0) {
          if (!fgTiles[tlp.x][placey]) {
            fgTiles[tlp.x][placey] = new Tile(tlp.x*tileSize,placey*tileSize,ladder,{
              canFlip:!1
            });

            player.iron--;
          }
        }
      }
    }

    for ( i=0;i<players.length;i++) {
      player.ud();
    }


    player.gnd = !1;

    // cloud spawner
    if (spawnCloudTick < spawnCloudDelay) {
      spawnCloudTick++;
    }
    else {
      let cloud = new Cloud(w, rint(0, h), rint(64, 256), rint(32, 64), cloud_imgs[rint(0,cloud_imgs.length-1)]);
      clouds.push(cloud);

      spawnCloudTick = 0;
    }

    // mob spawner
    
    if (spawnTick < spawnDelay) {
      spawnTick++;
    }
    else {
      let locations = [];

      withinCamLoop(snc, function(xp, yp) {
        if (tileWithinMap(xp, yp)) {
          let tl = tiles[xp][yp];

          if (tl != null) {
            if (yp - 1 >= 0) {
              if (tiles[xp][yp - 1] == null) {
                locations.push({ x: xp, y: yp - 1 });
              }
            }
          }
        }
      });

      if (mobs.length < 50) {
        let location = locations[rint(0, locations.length - 1)];

        if (location) {
          if (distance(
            player.x,
            player.y,
            location.x * tileSize,
            location.y * tileSize
          ) > 70) {
            let texture = oortbug;
            let width = 16;
            let height = 12;

            if (rint(0, 10) >= 5) {
              texture = slugger;
              height=8;
            }
            let mob = new OortBug(location.x*tileSize,location.y*tileSize,width,height,texture);

            mobs.push(mob);
          }
        }
      }
    
      spawnTick=0;
    }

    clouds = clouds.filter((cloud) => {
      return !cloud.canDestroy;
    });

    for ( i = 0; i < clouds.length; i++) {
      let cloud = clouds[i];

      if (cloud.x < -cloud.w) {
        cloud.canDestroy = true;
      }

      cloud.vy = -players[0].vy*bgParallax;

      cloud.ud();
    }

    parts = parts.filter((part) => {
      return !part.canDestroy
    });

    for ( i = 0; i < parts.length; i++) {
      let part = parts[i];
      part.ud();

      let tp = part.getTilePos();
      for ( xp = tp.x - 3; xp < tp.x + 3; xp++) {
        for ( yp = tp.y - 3; yp < tp.y + 3; yp++) {

          if (tileWithinMap(xp, yp)) {
            t = tiles[xp][yp];

            if (t !== null) {
              if (t.collidable) {
                d = colCheck(part, t);
          
                if (d === "bs") {
                  part.gnd = !0;
                }

                if (!d) {
                  part.gnd = false;
                }
              }
            }
          }
        }
      }
    }

    for ( i = 0; i < mobs.length; i++) {
      mob = mobs[i];
      mob.ud();

      mob.gnd = !1;

      if (player.x + player.w > mob.x &&
          player.x < mob.x + mob.w &&
          player.y + player.h > mob.y &&
          player.y < mob.y + mob.h) {

      
        if (player.vy >= 0 && player.y + player.h < mob.y + (mob.h/2)){
          player.jmp = !0;
          player.gnd = !1;
          if (player.jmp) {
            player.vy = -player.spd * 4;
          }
          else {
            player.vy = -player.spd * 2;
          }
          
          mobs.splice(i, 1);
        }
        else {
          let d = colRect(player, mob);

          if (d) {
            player.damage(1);
          }
        }

      }

      tp = mob.getTilePos();
      for ( xp = tp.x - 3; xp < tp.x + 3; xp++) {
        for ( yp = tp.y - 3; yp < tp.y + 3; yp++) {

          if (tileWithinMap(xp, yp)) {
            t = tiles[xp][yp];

            if (t !== null) {
              if (t.collidable) {
                d = colCheck(mob, t);
          
                if (d === "l" || d === "r") {
                  mob.owc(d);
                  mob.jmp = !1;
                } else if (d === "bs") {
                  mob.gnd = !0;
                  mob.jmp = !1;
                  mob.vy *= -1;
                }
              }
            }
          }
        }
      }

      if (
        mob.x < snc.lf * tileSize ||
        mob.x > (snc.lf + snc.w) * tileSize ||
        mob.y < snc.tp * tileSize ||
        mob.y > (snc.tp + snc.h) * tileSize
      ) {

        if (mob.despawnTick < mob.despawnDelay) {
          mob.despawnTick++;
        }
        else {
          mobs.splice(i, 1);
        }

      }
      else {
        mob.despawnTick = 0;
      }
      
      for ( j = 0; j < projs.length; j++) {
        if (colRect(projs[j], mob)) {

          let part = new Part(
            projs[j].x,
            projs[j].y,
            8,
            8,
            hit
          );
          part.delay = 2;
          part.useGravity = false;
          
          parts.push(part);

          mobs.splice(i, 1);
          projs.splice(j, 1);
        }
      }
    }

    for (i = 0; i < projs.length; i++) {
      projs[i].ud();
    }

    withinCamLoop(snc, (xp, yp) => {          
      tl = tiles[xp][yp];
        
      if (tl !== null) {

        tl.ud();

        if (tl.i == grass) {
          let args = {
            canFlip:false,
            destructible:true,
            collidable:true
          };
          
          if (xp-1 >= 0) {
            let tllf = tiles[xp-1][yp];
            if (tllf) {
              if (tllf.i == dirt) {
                if (!isTileAbove(xp-1, yp)) {
                  if (!tiles[xp-1][yp-1]) {
                    if (rint(0, 10000) > 9950)
                      tiles[xp-1][yp] = new Tile((xp-1)*tileSize,yp*tileSize,grass,args);
                  }
                }
              }
            }
          }

          if (xp+1 < mapw) {
            let tlrt = tiles[xp+1][yp];
            if (tlrt) {
              if (tlrt.i == dirt) {
                if (!isTileAbove(xp+1, yp)) {
                  if (!tiles[xp+1][yp-1]) {
                    if (rint(0, 10000) > 9950)
                      tiles[xp+1][yp] = new Tile((xp+1)*tileSize,yp*tileSize,grass,args);
                  }
                }
              }
            }
          }
        }
        else if (tl.i == lava && tl.elapsed % 120 == 0) {
          let args = {
            canFlip:true,
            destructible:false,
            collidable:false
          };

          if (yp+1 < maph) {
            let tlbot = tiles[xp][yp+1];
            if (!tlbot) {
              tiles[xp][yp+1] = new Tile(xp*tileSize,(yp+1)*tileSize,lava,args);
            }
          }
        }

        if (yp + 1 < maph) {
          if (getTileType(tl) == "rock" &&
              tl.i !== rock[2]) {
            if (!tiles[xp][yp + 1]) {
              if (rint(0, 10000) > 9990) {
                let part = new Part(
                  rint(tl.x - 2, tl.x + tl.w + 2),
                  tl.y + tl.h + 2,
                  4,
                  4,
                  null,
                  "#4444FF"
                );
                parts.push(part);
              }
            }
          }
          
          if (tl.i == rock[2]) {
            if (!tiles[xp][yp + 1]) {
              if (rint(0, 10000) > rint(9800, 9990)) {
                let part = new Part(
                  rint(tl.x - 2, tl.x + tl.w + 2),
                  tl.y + tl.h,
                  4,
                  4,
                  null,
                  "#ffe3a6"
                );
                part.useGravity = false;
                part.vy = 0.1;
                part.delay = rint(120, 1200);
                parts.push(part);
              }
            }
          }
        }

        if (tl.i == spcship) {
          if (player.ecrystal >= 1) {
            if (distance(
              player.x,
              player.y,
              tl.x,
              tl.y
            ) < 32) {

              tl.dmg = 100;

              spaceship = new Spaceship(xp*tileSize, yp*tileSize, tileSize, tileSize, spcship);
              spaceship.ay = -0.01;

              player.visible=false;
              camera.moveTo(spaceship.x, spaceship.y);
              hasLaunched = true;
            }
          }
        }

        if (tl.collidable) {
          d = colCheck(player, tl);

          let dmg = 0.05;

          if (tl.i == rockblue) {
            dmg = 0.5;
          }

          if (d === "l" || d === "r") {
            player.vx = 0;
            player.jmp = !1;
            player.anim.d=9999;

            tl.hit(dmg, d);

          } else if (d === "bs") {
            player.gnd = !0;
            player.jmp = !1;

            if (player.drlg) {
              tl.hit(dmg, d);
            }

            if (player.vy > 8) {
              player.damage(Math.round(player.vy * 0.1));
            }

          } else if (d === "t") {
            player.vy *= -1;
          }
        }

        if (tl.damage != null) {
          if (colRect(player, tl)) {
            player.damage(tl.damage);
          }
        }
        
        if (tl.dmg > 0) {
          tl.dmg -= 0.001;
        }
        
        if (tl.dmg >= 1) {

          if (tl.i == rockblue) {
            player.ammo += 1;
          }
          else if (tl.i == oiron) {
            let amt = 1;
            amt = rint(0,100)>80?rint(2,3):amt;
            player.iron += amt;
          }
          else if (tl.i == lifecanister) {
            player.maxhp += 1;
            player.hp = player.maxhp;
          }
          else if (tl.i == ecrystal) {
            player.ecrystal += 1;
          }

          tiles[xp][yp] = null;
        }
      }
    });

    players[0].x = clamp(players[0].x, 0, (mapw*tileSize)-players[0].w);
    players[0].y = clamp(players[0].y, 0, (maph*tileSize)-players[0].h + 128);

    if (players[0].y > maph * tileSize) {
      players[0].damage(50);
    }

    if (hasLaunched) {
      if (spaceship) {
        camera.moveTo(spaceship.x, spaceship.y);

        let colors = [
          "#ffb012",
          "#ffb012",
          "#ffffff"
        ]
        let color = colors[rint(0, colors.length - 1)];
        let size = rint(2, 16);

        for ( i = 0; i < 4; i++) {
          let part = new Part(
            rint(spaceship.x - 4, spaceship.x + spaceship.w - 8),
            rint(spaceship.y + spaceship.h, spaceship.y + spaceship.h + 32),
            size,
            size,
            null,
            color
          );
          part.delay = 15;
          part.vy = rint(0, 5);
          parts.push(part);
        }
      }
    }
    else {
      if (mapPreviewMode) {
        camera.moveTo((mapw * tileSize)/2, (maph * tileSize)/2);
      }
      else {
        ppos= { x: players[0].x, y: players[0].y };
        camera.moveTo(Math.round(ppos.x), Math.round(ppos.y));
      }
    }
    camera.vp.lf = clamp(camera.vp.lf, 0, (mapw*tileSize) - camera.vp.w);
    camera.vp.tp = clamp(camera.vp.tp, 0, (maph*tileSize) - camera.vp.h);
  }
}
function draw(ctx){

  ctx.clearRect(0,0,w,h - 4);

  if (wldt.hasSky) {
    ctx.save();
    ctx.fillStyle = wldt.skyColor;
    ctx.fillRect(0, 0, w, h);

    // Create gradient
    grd = ctx.createLinearGradient(w, 0, w, h);

    // Add colors
    grd.addColorStop(0.000, 'rgba(0, 0, 0, 0.500)');
    grd.addColorStop(1.000, 'rgba(0, 0, 0, 0.000)');
    
    // Fill with gradient
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  for ( i = 0; i < clouds.length; i++) {
    let cloud = clouds[i];

    cloud.draw(ctx);
  }

  camera.begin();

  wcam = { x: camera.vp.lf, y: camera.vp.tp, w: camera.vp.w, h: camera.vp.h };
  snc = {
    lf: sgf(wcam.x, tileSize)/tileSize,
    tp: sgf(wcam.y, tileSize)/tileSize,
    w: (sgf(camera.vp.w, tileSize)/tileSize),
    h: (sgf(camera.vp.h, tileSize)/tileSize)
  };

  withinCamLoop(snc, function(xp, yp) {
    let bgTile = bgTiles[xp][yp];
    let fgTile = fgTiles[xp][yp];
    let tl = tiles[xp][yp];

    if (bgTile) {
      if (!tiles[xp][yp] || tiles[xp][yp].i == ecrystal) {
        bgTile.draw(ctx);
      }
    }

    if (fgTile) {
      fgTile.draw(ctx);
    }

    if (tl) {
      tl.draw(ctx);
    }
  });

  if (spaceship) {
    spaceship.draw(ctx);
  }

  for(i=0;i<parts.length;i++) {
    parts[i].draw(ctx);
  }

  for(i=0;i<players.length;i++){
    players[i].draw(ctx);
  }

  for(i=0;i<mobs.length;i++){
    mobs[i].draw(ctx);
  }

  for (i=0;i<projs.length;i++){
    projs[i].draw(ctx);
  }

  camera.end();

  if (players.length > 0) {

    if (movedTick > 2000) {
      hasMovedAround = true;
    }

    for ( i = 0; i < players[0].maxhp; i++) {
      ctx.drawImage(heartempty, 32 + (i * 32), 32, 32, 32);
      if (i < players[0].hp) {
        ctx.drawImage(heart, 32 + (i * 32), 32, 32, 32);
      }
    }

    let inv = [
      { ic: ecrystal, t: player.ecrystal + "/9" },
      { ic: plasmaball, t: player.ammo },
      { ic: oiron, t: player.iron }
    ];

    for ( i = 0; i < inv.length; i++) {
      let item = inv[i];
      ctx.drawImage(item.ic, 32, 80 + (i * 48), 32, 32);

      ctx.save();
      ctx.font = "bold 24px monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText(item.t, 72, 106 + (i * 48));
      ctx.restore();
    }

    let message = [];
    let restartMessage = "";
    let baseY = 280;

    if (!hasMovedAround && !mapPreviewMode && !players[0].dead && !hasLaunched) {
      message[0] = "CRYSTAL BLAST";
      message[1] = "";
      message[2] = "You're stranded!";
      message[3] = "Collect nine energy crystals to get back.";
      message[4] = "Z=Jump; X=Dash/Shoot; Left/Right Arrow=Move and Drill; Drill Down=Down Arrow; Ladders=Up Arrow";

      baseY = 64;
    }

    if (players[0].dead) {
      message[0] = "You broke. :c";
      restartMessage="Please reload your browser to restart.";
    }

    if (hasLaunched && spaceship.y < 0) {
      message[0] = "You're on your way to orbit!";
      restartMessage="Reload to run out of fuel and crash again.";
    }

    if (message != "") {
      ctx.save();
      ctx.fillStyle = "#111";
      ctx.fillRect(0, baseY - 32, w, 128);
      ctx.fillStyle = "#fff";
      let fontSize = (32 - (message.length * 4));
      ctx.font = fontSize + "px monospace";
      for ( i = 0; i < message.length; i++) {
        ctx.fillText(message[i], (w/2)-ctx.measureText(message[i]).width/2, baseY + fontSize + (i * (fontSize + 4)));
      }
      ctx.font = "14px monospace";
      ctx.fillText(restartMessage, (w/2)-ctx.measureText(restartMessage).width/2, 340);
      ctx.restore();
    }
  }

}
function ml() {
  ud();
  draw(ctx);
  requestAnimationFrame(ml);
}
ael=addEventListener;
ael('DOMContentLoaded',(e)=>{
  init();
  ml();
});
ael('keydown',e=>{
  c=e.keyCode||e.which;
  k[c]=1;
});
ael('keyup',e=>{
  c=e.keyCode||e.which;
  k[c]=0;
});
