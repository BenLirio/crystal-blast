(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

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

let w=a.width;
let h=a.height;
let mapw=40*2;
let maph=(32 * 3)+6;
let ctx=a.getContext('2d', { alpha: !1 });
ctx.imageSmoothingEnabled=false;
ctx.mozImageSmoothingEnabled=false;
ctx.msImageSmoothingEnabled=false;
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9tYWluIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbihmdW5jdGlvbigpe1xuICBtb2R1bGUgPSB3aW5kb3cubm9pc2UgPSB7fTtcblxuICBmdW5jdGlvbiBHKHgsIHksIHopIHtcbiAgICB0aGlzLnggPSB4OyB0aGlzLnkgPSB5OyB0aGlzLnogPSB6O1xuICB9XG4gIFxuICBHLnByb3RvdHlwZS5kb3QyID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiB0aGlzLngqeCArIHRoaXMueSp5O1xuICB9O1xuXG4gIGczID0gW25ldyBHKDEsMSwwKSxuZXcgRygtMSwxLDApLG5ldyBHKDEsLTEsMCksbmV3IEcoLTEsLTEsMCksXG4gICAgICAgICAgICAgIG5ldyBHKDEsMCwxKSxuZXcgRygtMSwwLDEpLG5ldyBHKDEsMCwtMSksbmV3IEcoLTEsMCwtMSksXG4gICAgICAgICAgICAgIG5ldyBHKDAsMSwxKSxuZXcgRygwLC0xLDEpLG5ldyBHKDAsMSwtMSksbmV3IEcoMCwtMSwtMSldO1xuXG4gIGxldCBwID0gW107XG4gIHdoaWxlIChwLmxlbmd0aDwzMDApIHtcbiAgICBwLnB1c2gocmludCgwLDI1NSkpO1xuICB9XG4gIHAgPSBbLi4ubmV3IFNldChwKV07XG4gIC8vIFRvIHJlbW92ZSB0aGUgbmVlZCBmb3IgaW5kZXggd3JhcHBpbmcsIGRvdWJsZSB0aGUgcGVybXV0YXRpb24gdGFibGUgbGVuZ3RoXG4gIHBlcm0gPSBuZXcgQXJyYXkoNTEyKTtcbiAgZ1AgPSBuZXcgQXJyYXkoNTEyKTtcblxuICAvLyBUaGlzIGlzbid0IGEgdmVyeSBnb29kIHNlZWRpbmcgZnVuY3Rpb24sIGJ1dCBpdCB3b3JrcyBvay4gSXQgc3VwcG9ydHMgMl4xNlxuICAvLyBkaWZmZXJlbnQgc2VlZCB2YWx1ZXMuIFdyaXRlIHNvbWV0aGluZyBiZXR0ZXIgaWYgeW91IG5lZWQgbW9yZSBzZWVkcy5cbiAgbW9kdWxlLnNlZWQgPSBmdW5jdGlvbihzZWVkKSB7XG4gICAgaWYoc2VlZCA+IDAgJiYgc2VlZCA8IDEpIHtcbiAgICAgIC8vIFNjYWxlIHRoZSBzZWVkIG91dFxuICAgICAgc2VlZCAqPSA2NTUzNjtcbiAgICB9XG5cbiAgICBzZWVkID0gTWF0aC5mbG9vcihzZWVkKTtcbiAgICBpZihzZWVkIDwgMjU2KSB7XG4gICAgICBzZWVkIHw9IHNlZWQgPDwgODtcbiAgICB9XG5cbiAgICBmb3IoIGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgICAgIHY9MDtcbiAgICAgIGlmIChpICYgMSkge1xuICAgICAgICB2ID0gcFtpXSBeIChzZWVkICYgMjU1KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHYgPSBwW2ldIF4gKChzZWVkPj44KSAmIDI1NSk7XG4gICAgICB9XG5cbiAgICAgIHBlcm1baV0gPSBwZXJtW2kgKyAyNTZdID0gdjtcbiAgICAgIGdQW2ldID0gZ1BbaSArIDI1Nl0gPSBnM1t2ICUgMTJdO1xuICAgIH1cbiAgfTtcblxuICBtb2R1bGUuc2VlZCgwKTtcblxuICAvLyAjIyMjIyBQZXJsaW4gbm9pc2Ugc3R1ZmZcblxuICBmdW5jdGlvbiBmYWRlKHQpIHtcbiAgICByZXR1cm4gdCp0KnQqKHQqKHQqNi0xNSkrMTApO1xuICB9XG5cbiAgZnVuY3Rpb24gbGVycChhLCBicywgdCkge1xuICAgIHJldHVybiAoMS10KSphICsgdCpicztcbiAgfVxuXG4gIC8vIDJEIFBlcmxpbiBOb2lzZVxuICBtb2R1bGUucGVybGluMiA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAvLyBGaW5kIHVuaXQgZ3JpZCBjZWxsIGNvbnRhaW5pbmcgcG9pbnRcbiAgICBYID0gTWF0aC5mbG9vcih4KSwgWSA9IE1hdGguZmxvb3IoeSk7XG4gICAgLy8gR2V0IHJlbGF0aXZlIHh5IGNvb3JkaW5hdGVzIG9mIHBvaW50IHdpdGhpbiB0aGF0IGNlbGxcbiAgICB4ID0geCAtIFg7IHkgPSB5IC0gWTtcbiAgICAvLyBXcmFwIHRoZSBpbnRlZ2VyIGNlbGxzIGF0IDI1NSAoc21hbGxlciBpbnRlZ2VyIHBlcmlvZCBjYW4gYmUgaW50cm9kdWNlZCBoZXJlKVxuICAgIFggPSBYICYgMjU1OyBZID0gWSAmIDI1NTtcblxuICAgIC8vIENhbGN1bGF0ZSBub2lzZSBjb250cmlidXRpb25zIGZyb20gZWFjaCBvZiB0aGUgZm91ciBjb3JuZXJzXG4gICAgbjAwID0gZ1BbWCtwZXJtW1ldXS5kb3QyKHgsIHkpO1xuICAgIG4wMSA9IGdQW1grcGVybVtZKzFdXS5kb3QyKHgsIHktMSk7XG4gICAgbjEwID0gZ1BbWCsxK3Blcm1bWV1dLmRvdDIoeC0xLCB5KTtcbiAgICBuMTEgPSBnUFtYKzErcGVybVtZKzFdXS5kb3QyKHgtMSwgeS0xKTtcblxuICAgIC8vIENvbXB1dGUgdGhlIGZhZGUgY3VydmUgdmFsdWUgZm9yIHhcbiAgICB1ID0gZmFkZSh4KTtcblxuICAgIC8vIEludGVycG9sYXRlIHRoZSBmb3VyIHJlc3VsdHNcbiAgICByZXR1cm4gbGVycChcbiAgICAgICAgbGVycChuMDAsIG4xMCwgdSksXG4gICAgICAgIGxlcnAobjAxLCBuMTEsIHUpLFxuICAgICAgZmFkZSh5KSk7XG4gIH07XG5cbn0pKHRoaXMpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgQ2FtID0gZnVuY3Rpb24oY29udGV4dCwgc2V0dGluZ3MpIHtcbiAgICBzZXR0aW5ncyA9IHNldHRpbmdzIHx8IHt9O1xuICAgIGxldCB0ID0gdGhpcztcbiAgICB0LmQgPSAxMDAwLjA7XG4gICAgdC5sYSA9IFswLDBdO1xuICAgIHQuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdC5maWVsZE9mVmlldyA9IHNldHRpbmdzLmZpZWxkT2ZWaWV3IHx8IE1hdGguUEkgLyA0LjA7XG4gICAgdC52cCA9IHtcbiAgICAgIGxmOiAwLFxuICAgICAgcnQ6IDAsXG4gICAgICB0cDogMCxcbiAgICAgIGJvdHRvbTogMCxcbiAgICAgIHc6IDAsXG4gICAgICBoOiAwLFxuICAgICAgc2NhbGU6IFsxLjAsIDEuMF1cbiAgICB9O1xuICAgIHQudXBkYXRldnAoKTtcbiAgfTtcblxuICBDYW0ucHJvdG90eXBlID0ge1xuICAgIGJlZ2luOiBmdW5jdGlvbigpIHtcbiAgICAgIGxldCB0ID0gdGhpcztcbiAgICAgIHQuY29udGV4dC5zYXZlKCk7XG4gICAgICB0LmFwcGx5U2NhbGUoKTtcbiAgICAgIHQuYXBwbHlUcmFuc2xhdGlvbigpO1xuICAgIH0sXG4gICAgZW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY29udGV4dC5yZXN0b3JlKCk7XG4gICAgfSxcbiAgICBhcHBseVNjYWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY29udGV4dC5zY2FsZSh0aGlzLnZwLnNjYWxlWzBdLCB0aGlzLnZwLnNjYWxlWzFdKTtcbiAgICB9LFxuICAgIGFwcGx5VHJhbnNsYXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jb250ZXh0LnRyYW5zbGF0ZSgtdGhpcy52cC5sZiwgLXRoaXMudnAudHApO1xuICAgIH0sXG4gICAgdXBkYXRldnA6IGZ1bmN0aW9uKCkge1xuICAgICAgbGV0IHQgPSB0aGlzO1xuICAgICAgdC5hc3BlY3RSYXRpbyA9IHQuY29udGV4dC5jYW52YXMud2lkdGggLyB0LmNvbnRleHQuY2FudmFzLmhlaWdodDtcbiAgICAgIHQudnAudyA9IHQuZCAqIE1hdGgudGFuKHQuZmllbGRPZlZpZXcpO1xuICAgICAgdC52cC5oID0gdC52cC53IC8gdC5hc3BlY3RSYXRpbztcbiAgICAgIHQudnAubGYgPSB0LmxhWzBdIC0gKHQudnAudyAvIDIuMCk7XG4gICAgICB0LnZwLnRwID0gdC5sYVsxXSAtICh0LnZwLmggLyAyLjApO1xuICAgICAgdC52cC5ydCA9IHQudnAubGYgKyB0LnZwLnc7XG4gICAgICB0LnZwLmJvdHRvbSA9IHQudnAudHAgKyB0LnZwLmg7XG4gICAgICB0LnZwLnNjYWxlWzBdID0gdC5jb250ZXh0LmNhbnZhcy53aWR0aCAvIHQudnAudztcbiAgICAgIHQudnAuc2NhbGVbMV0gPSB0LmNvbnRleHQuY2FudmFzLmhlaWdodCAvIHQudnAuaDtcbiAgICB9LFxuICAgIHpvb21UbzogZnVuY3Rpb24oeikge1xuICAgICAgdGhpcy5kID0gejtcbiAgICAgIHRoaXMudXBkYXRldnAoKTtcbiAgICB9LFxuICAgIG1vdmVUbzogZnVuY3Rpb24oeCwgeSkge1xuICAgICAgbGV0IHQgPSB0aGlzO1xuICAgICAgdC5sYVswXSA9IHg7XG4gICAgICB0LmxhWzFdID0geTtcbiAgICAgIHQudXBkYXRldnAoKTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5DYW0gPSBDYW07XG4gIFxufSkuY2FsbCh0aGlzKTtcblxubGV0IHc9YS53aWR0aDtcbmxldCBoPWEuaGVpZ2h0O1xubGV0IG1hcHc9NDAqMjtcbmxldCBtYXBoPSgzMiAqIDMpKzY7XG5sZXQgY3R4PWEuZ2V0Q29udGV4dCgnMmQnLCB7IGFscGhhOiAhMSB9KTtcbmN0eC5pbWFnZVNtb290aGluZ0VuYWJsZWQ9ZmFsc2U7XG5jdHgubW96SW1hZ2VTbW9vdGhpbmdFbmFibGVkPWZhbHNlO1xuY3R4Lm1zSW1hZ2VTbW9vdGhpbmdFbmFibGVkPWZhbHNlO1xubGV0IGNhbWVyYT1uZXcgQ2FtKGN0eCk7XG5sZXQgcGxheWVycyA9IFtdO1xubGV0IGdyYXZpdHk9MC4yO1xubGV0IHNjcmVlbj0xO1xubGV0IGs9W107Ly9pbnB0XG5sZXQgYmdUaWxlcyA9IGEyKG1hcHcsIG1hcGgsIG51bGwpO1xubGV0IHRpbGVzPWEyKG1hcHcsIG1hcGgsIG51bGwpO1xubGV0IGZnVGlsZXMgPSBhMihtYXB3LCBtYXBoLCBudWxsKTtcbmxldCB0aWxlU2l6ZT0zMjsvL3RsIHNpemVcbmxldCBiZ1BhcmFsbGF4ID0gMC4yNTtcbmxldCBzcGFjZXNoaXAgPSBudWxsO1xubGV0IGhhc0xhdW5jaGVkID0gZmFsc2U7XG5sZXQgY2xvdWRzPVtdO1xubGV0IG1vYnM9W107XG5sZXQgcGFydHM9W107XG5sZXQgcHJvanM9W107XG5sZXQgc3Bhd25EZWxheT0zMDA7XG5sZXQgc3Bhd25UaWNrPTA7XG5sZXQgc3Bhd25DbG91ZERlbGF5ID0gNjA7XG5sZXQgc3Bhd25DbG91ZFRpY2sgPSAwO1xubGV0IGhhc01vdmVkQXJvdW5kID0gZmFsc2U7XG5sZXQgbW92ZWRUaWNrID0gMDtcbmxldCBtYXBQcmV2aWV3TW9kZSA9IGZhbHNlO1xubGV0IG49bm9pc2U7XG5sZXQgbXNlZWQ9cmludCgwLDYwMDApO1xubGV0IHNlZWRzPVtdO1xuZm9yICggaT0wO2k8MTA7aSsrKSB7XG4gIHNlZWRzLnB1c2gocmludCgwLDYwMDApKTtcbn1cbm5vaXNlLnNlZWQobXNlZWQpO1xuXG5sZXQgaXI9J2ltYWdlcy8nO1xuXG5sZXQgbG9nPWxjKCdsb2cnKTtcbmxldCBsZWF2ZXM9bGMoJ2xlYXZlcycpO1xubGV0IGNhY3R1cz1sYygnY2FjdHVzJyk7XG5sZXQgZ3Jhc3M9bGMoJ2dyYXNzJyk7XG5sZXQgZGlydD1sYygnZGlydCcpO1xubGV0IHJvY2sgPSBsYygncm9jaycsIDQpO1xubGV0IHJvY2tibHVlPWxjKCdyb2NrYmx1ZScpO1xubGV0IG9pcm9uPWxjKCdvaXJvbicpO1xubGV0IGxhdmFyb2NrPWxjKCdsYXZhcm9jaycpO1xubGV0IGJlZHJvY2s9bGMoJ2JlZHJvY2snKTtcbmxldCBsYWRkZXI9bGMoJ2xhZGRlcicpO1xubGV0IGxhdmE9bGMoJ2xhdmEnKTtcbmxldCBlY3J5c3RhbD1sYygnZWNyeXN0YWwnKTtcbmxldCBiZ19yb2NrcyA9IGxjKCdiZ19yb2NrJywgNCk7XG5sZXQgYmdfbGF2YXJvY2s9bGMoJ2JnX2xhdmFyb2NrJyk7XG5sZXQgYmdfc3RhcnM9bGMoJ2JnX3N0YXJzJyk7XG5sZXQgaGl0PWxjKCdoaXQnKTtcbmxldCBzcGNzaGlwPWxjKCdzcGNzaGlwJyk7XG5sZXQgcGxheWVyPWxjKCdwbGF5ZXInLCcuZ2lmJyk7XG5sZXQgcGxheWVyX2RyaWxsaW5nPWxjKCdwbGF5ZXJkb3duJyk7XG5sZXQgcGxhc21hYmFsbD1sYygncGxhc21hYmFsbCcpO1xubGV0IG9vcnRidWc9bGMoJ29vcnRidWcnKTtcbmxldCBzbHVnZ2VyPWxjKCdzbHVnZ2VyJyk7XG5sZXQgaGVhcnQ9bGMoJ2hlYXJ0Jyk7XG5sZXQgaGVhcnRlbXB0eT1sYygnaGVhcnRlbXB0eScpO1xubGV0IGxpZmVjYW5pc3Rlcj1sYygnbGlmZWNhbmlzdGVyJyk7XG5sZXQgY2xvdWRfaW1ncyA9IGxjKCdjbG91ZCcsIDEpO1xuXG5sZXQgd2xkdHMgPSBbXG4gIHtcbiAgICBuYW1lOiBcImdyYXNzXCIsXG4gICAgcm9ja0luZGV4OiAwLFxuICAgIGhhc0dyYXNzOiB0cnVlLFxuICAgIGhhc0RpcnQ6IHRydWUsXG4gICAgaGFzU2t5OiB0cnVlXG4gIH0sXG4gIHtcbiAgICBuYW1lOiBcImJsdWVcIixcbiAgICByb2NrSW5kZXg6IDEsXG4gICAgaGFzR3Jhc3M6ICFyaW50KDAsIDEpLFxuICAgIGhhc0RpcnQ6ICFyaW50KDAsIDEpLFxuICAgIGhhc1NreTogdHJ1ZVxuICB9LFxuICB7XG4gICAgbmFtZTogXCJzYW5kXCIsXG4gICAgcm9ja0luZGV4OiAyLFxuICAgIGhhc0dyYXNzOiAhMSxcbiAgICBoYXNEaXJ0OiAhMSxcbiAgICBoYXNTa3k6IHRydWVcbiAgfSxcbiAge1xuICAgIG5hbWU6IFwid2FzdGVsYW5kXCIsXG4gICAgcm9ja0luZGV4OiAzLFxuICAgIGhhc0dyYXNzOiAhMSxcbiAgICBoYXNTa3k6IHRydWVcbiAgfVxuXTtcbndsZHQgPSB3bGR0c1tyaW50KDAsIHdsZHRzLmxlbmd0aCAtIDEpXTsgIFxuZnVuY3Rpb24gZ2V0UmFuZG9tSGV4KCkge1xuICBsZXQgY2hhcnMgPSBbMSwyLDMsNCw1LDYsNyw4LDksXCJBXCIsXCJCXCIsXCJDXCIsXCJEXCIsXCJFXCIsXCJGXCJdO1xuICBsZXQgY29kZSA9IFwiI1wiO1xuICBmb3IgKCBpID0gMDsgaSA8IDY7IGkrKykge1xuICAgIGNvZGUgKz0gY2hhcnNbcmludCgwLCBjaGFycy5sZW5ndGggLSAxKV07XG4gIH1cbiAgcmV0dXJuIGNvZGU7XG59XG53bGR0LnNreUNvbG9yID0gZ2V0UmFuZG9tSGV4KCk7XG5cbmZ1bmN0aW9uIGRpc3RhbmNlKHgxLCB5MSwgeDIsIHkyKXtcbiAgbGV0IGEgPSB4MSAtIHgyO1xuICBsZXQgYiA9IHkxIC0geTI7XG4gIFxuICByZXR1cm4gTWF0aC5oeXBvdChhLCBiKTtcbn1cblxuZnVuY3Rpb24gY2xhbXAodmFsLCBtaW4sIG1heCkge1xuICBpZiAodmFsIDwgbWluKSByZXR1cm4gbWluO1xuICBpZiAodmFsID4gbWF4KSByZXR1cm4gbWF4O1xuICByZXR1cm4gdmFsO1xufVxuXG5mdW5jdGlvbiByaW50KG1pbiwgbWF4KSB7XG4gICAgbWluID0gTWF0aC5jZWlsKG1pbik7XG4gICAgbWF4ID0gTWF0aC5mbG9vcihtYXgpO1xuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xufVxuXG5mdW5jdGlvbiB3aXRoaW5DYW1Mb29wKHNuYywgY2FsbGJhY2spIHtcbiAgZm9yICggeHAgPSBzbmMubGYgLSAyOyB4cCA8IHNuYy5sZiArIHNuYy53ICsgMjsgeHArKykge1xuICAgIGZvciAoIHlwID0gc25jLnRwIC0gMjsgeXAgPCBzbmMudHAgKyBzbmMuaCArIDI7IHlwKyspIHtcblxuICAgICAgaWYgKHRpbGVXaXRoaW5NYXAoeHAsIHlwKSkge1xuXG4gICAgICAgIGNhbGxiYWNrKHhwLCB5cCk7XG5cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdGlsZVdpdGhpbk1hcCh4LCB5KSB7XG4gIGlmICh4ID49IDAgJiYgeCA8IG1hcHcgJiZcbiAgICAgIHkgPj0gMCAmJiB5IDwgbWFwaCkge1xuICAgIFxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiBjb2xDaGVjayhzaGFwZUEsIHNoYXBlQikge1xuICBcbiAgLy8gZ2V0IHRoZSB2ZWN0b3JzIHRvIGNoZWNrIGFnYWluc3RcbiAgdlggPSAoc2hhcGVBLnggKyAoc2hhcGVBLncgLyAyKSkgLSAoc2hhcGVCLnggKyAoc2hhcGVCLncgLyAyKSksXG4gICAgICB2WSA9IChzaGFwZUEueSArIChzaGFwZUEuaCAvIDIpKSAtIChzaGFwZUIueSArIChzaGFwZUIuaCAvIDIpKSxcbiAgICAgIC8vIGFkZCB0aGUgaGFsZiB3aWR0aHMgYW5kIGhhbGYgaGVpZ2h0cyBvZiB0aGUgb2JqZWN0c1xuICAgICAgaFdpZHRocyA9IChzaGFwZUEudyAvIDIpICsgKHNoYXBlQi53IC8gMiksXG4gICAgICBoSGVpZ2h0cyA9IChzaGFwZUEuaCAvIDIpICsgKHNoYXBlQi5oIC8gMiksXG4gICAgICBjb2xkID0gbnVsbDtcbiAgLy8gaWYgdGhlIHggYW5kIHkgdmVjdG9yIGFyZSBsZXNzIHRoYW4gdGhlIGhhbGYgdyBvciBoYWxmIGgsIHRoZXkgd2UgbXVzdCBiZSBpbnNpZGUgdGhlIG9iamVjdCwgY2F1c2luZyBhIGNvbGxpc2lvblxuICBpZiAoTWF0aC5hYnModlgpIDwgaFdpZHRocyAmJiBNYXRoLmFicyh2WSkgPCBoSGVpZ2h0cykge1xuICAgICAgLy8gZmlndXJlcyBvdXQgb24gd2hpY2ggc2lkZSB3ZSBhcmUgY29sbGlkaW5nICh0cCwgYm90dG9tLCBsZiwgb3IgcnQpXG4gICAgICBvWCA9IGhXaWR0aHMgLSBNYXRoLmFicyh2WCksXG4gICAgICAgICAgb1kgPSBoSGVpZ2h0cyAtIE1hdGguYWJzKHZZKTtcbiAgICAgIGlmIChvWCA+PSBvWSkge1xuICAgICAgICAgIGlmICh2WSA+IDApIHtcbiAgICAgICAgICAgIGlmIChzaGFwZUEudnkgPCAxMCkge1xuICAgICAgICAgICAgICAgIGNvbGQgPSBcInRcIjtcbiAgICAgICAgICAgICAgICBzaGFwZUEueSArPSBvWTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBpZiAodlggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29sZCA9IFwibFwiO1xuICAgICAgICAgICAgICAgIHNoYXBlQS54ICs9IG9YO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbGQgPSBcInJcIjtcbiAgICAgICAgICAgICAgICBzaGFwZUEueCAtPSBvWDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbGQgPSBcImJzXCI7XG4gICAgICAgICAgICAgIHNoYXBlQS55IC09IG9ZO1xuICAgICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHZYID4gMCkge1xuICAgICAgICAgICAgICBjb2xkID0gXCJsXCI7XG4gICAgICAgICAgICAgIHNoYXBlQS54ICs9IG9YO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbGQgPSBcInJcIjtcbiAgICAgICAgICAgICAgc2hhcGVBLnggLT0gb1g7XG4gICAgICAgICAgfVxuICAgICAgfVxuICB9XG4gIHJldHVybiBjb2xkO1xufVxuXG5mdW5jdGlvbiBjb2xSZWN0KHJlY3QxLCByZWN0Mikge1xuICBpZiAocmVjdDEueCA8IHJlY3QyLnggKyByZWN0Mi53ICYmXG4gICAgcmVjdDEueCArIHJlY3QxLncgPiByZWN0Mi54ICYmXG4gICAgcmVjdDEueSA8IHJlY3QyLnkgKyByZWN0Mi5oICYmXG4gICAgcmVjdDEueSArIHJlY3QxLmggPiByZWN0Mi55KSB7XG4gICAgICAvLyBjb2xsaXNpb24gZGV0ZWN0ZWQhXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHNnZih2YWx1ZSwgY2VsbFNpemUpIHtcbiAgcmV0dXJuIE1hdGguZmxvb3IodmFsdWUgLyBjZWxsU2l6ZSkgKiBjZWxsU2l6ZTtcbn1cblxuZnVuY3Rpb24gaXNUaWxlQWJvdmUoeHAsIHlwKSB7XG4gIGZvciAoIHkgPSB5cCAtIDE7IHkgPiAwOyB5LS0pIHtcbiAgICBpZiAodGlsZXNbeHBdW3ldKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBnZXRUaWxlVHlwZSh0bCkge1xuICBsZXQgdHlwZSA9IG51bGw7XG5cbiAgZm9yICggaSA9IDA7IGkgPCByb2NrLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRsLmkgPT0gcm9ja1tpXSkge1xuICAgICAgdHlwZSA9IFwicm9ja1wiO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0eXBlO1xufVxuXG5mdW5jdGlvbiBtYWtlVHJlZSh4LCB5LCBsb2dUeXBlLCBoZWlnaHQsIGhhc0xlYXZlcywgYXJncykge1xuXG4gIGxldCB0b3AgPSB5IC0gaGVpZ2h0O1xuICBsZXQgcmFkID0gcmludCgzLCA1KTtcblxuICBmb3IgKGx5ID0geTsgbHkgPiB0b3A7IGx5LS0pIHtcbiAgICBpZiAodGlsZVdpdGhpbk1hcCh4LCBseSkpIHtcbiAgICAgIHRpbGVzW3hdW2x5XSA9IG5ldyBUaWxlKHgqdGlsZVNpemUsbHkqdGlsZVNpemUsbG9nVHlwZSxhcmdzKTtcblxuICAgICAgaWYgKGx5ID09IHRvcCArIDEgJiYgaGFzTGVhdmVzKSB7XG4gICAgICAgIGZvciAoIHhwID0gLXJhZDsgeHAgPCByYWQ7IHhwKyspIHtcbiAgICAgICAgICBmb3IgKCB5cCA9IC1yYWQ7IHlwIDwgcmFkOyB5cCsrKSB7XG4gICAgICAgICAgICBpZiAoKHhwICogeHApICsgKHlwICogeXApIDwgTWF0aC5wb3cocmFkLCAyKSkge1xuICAgICAgICAgICAgICBpZiAodGlsZVdpdGhpbk1hcCh4K3hwLCB5K3lwKSkge1xuICAgICAgICAgICAgICAgIHRpbGVzW3greHBdW2x5K3lwXSA9IG5ldyBUaWxlKCh4K3hwKSp0aWxlU2l6ZSwobHkreXApKnRpbGVTaXplLGxlYXZlcyxhcmdzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBBbmltIHtcbiAgY29uc3RydWN0b3IoYW10RixmLGQpIHtcbiAgICBsZXQgdCA9IHRoaXM7XG4gICAgdC5hbXRGPWFtdEY7XG4gICAgdC5mPWY7XG4gICAgdC50PTA7XG4gICAgdC5kPWQ7XG4gICAgdC5vbj0hMDtcbiAgfVxuICB1ZCgpe1xuICAgIGxldCB0ID0gdGhpcztcbiAgICBpZiAodC5vbikge1xuICAgICAgaWYodC50PHQuZCl7XG4gICAgICAgIHQudCsrO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmKHQuZjx0LmFtdEYtMSl7XG4gICAgICAgICAgdC5mKys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICB0LmY9MDtcbiAgICAgICAgfVxuICAgICAgICB0LnQ9MDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgVGlsZSB7XG4gIGNvbnN0cnVjdG9yKHgseSxpLGFyZ3Mpe1xuICAgIGFyZ3M9YXJnc3x8e1xuICAgICAgY2FuRmxpcDp0cnVlLFxuICAgICAgZGVzdHJ1Y3RpYmxlOnRydWUsXG4gICAgICBjb2xsaWRhYmxlOnRydWUsXG4gICAgICBkYW1hZ2U6IG51bGxcbiAgICB9O1xuICAgIGxldCB0ID0gdGhpcztcbiAgICB0Lng9eDtcbiAgICB0Lnk9eTtcbiAgICB0Lmk9aTtcbiAgICB0Lnc9dGlsZVNpemU7XG4gICAgdC5oPXRpbGVTaXplO1xuICAgIHQuaGY9MDsgLy8gaG9yaXpvbnRhbCBmbGlwXG4gICAgdC52Zj0wOyAvLyB2ZXJ0aWNhbCBmbGlwXG4gICAgdC5jb2xsaWRhYmxlPWFyZ3MuY29sbGlkYWJsZTtcbiAgICB0LmRlc3RydWN0aWJsZT1hcmdzLmRlc3RydWN0aWJsZTtcbiAgICB0LmRhbWFnZT1hcmdzLmRhbWFnZTtcbiAgICB0LmVsYXBzZWQgPSAxO1xuICAgIGlmIChhcmdzLmNhbkZsaXApIHtcbiAgICAgIHQuaGY9cmludCgwLDEpO1xuICAgICAgdC52Zj1yaW50KDAsMSk7XG4gICAgfVxuICAgIHQuaVZpcz0hMDsvL2ltZyB2aXNpYmxlXG4gICAgdC5yVmlzPSExOy8vcmVjdCB2aXNpYmxlXG4gICAgdC5yQ29sPScjMDAwJztcbiAgICB0LmRtZyA9IDA7XG4gIH1cbiAgaGl0KGFtdCwgZCkge1xuICAgIGxldCB0ID0gdGhpcztcbiAgICBpZiAodC5kbWcgPCAxICYmIHQuZGVzdHJ1Y3RpYmxlKSB7XG4gICAgICB0LmRtZyArPSBhbXQ7XG5cbiAgICAgIGxldCB5ID0gcmludCh0LnkgLSAyLCB0LnkgKyB0LmggKyAyKTtcbiAgICAgIGxldCB2eSA9IDA7XG5cbiAgICAgIGlmIChkID09ICdicycpIHtcbiAgICAgICAgeSA9IHQueSAtIDI7XG4gICAgICAgIHZ5ID0gLXJpbnQoMSwgMyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyaW50KDAsIDEwMCkgPiA4MCkge1xuICAgICAgICBsZXQgcGFydCA9IG5ldyBQYXJ0KFxuICAgICAgICAgIHJpbnQodC54IC0gMiwgdC54ICsgdC53ICsgMiksXG4gICAgICAgICAgeSxcbiAgICAgICAgICA0LFxuICAgICAgICAgIDQsXG4gICAgICAgICAgdGhpcy5pXG4gICAgICAgICk7XG4gICAgICAgIHBhcnQudnkgPSB2eTtcblxuICAgICAgICBwYXJ0cy5wdXNoKHBhcnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICB1ZCgpIHtcbiAgICBsZXQgdCA9IHRoaXM7XG4gICAgXG4gICAgdC5lbGFwc2VkKys7XG4gIH1cbiAgZHJhdyhjdHgpe1xuICAgIGxldCB0ID0gdGhpcztcbiAgICBpZiAodC5pVmlzICYmICF0LnJWaXMpIHtcbiAgICAgIGN0eC5zYXZlKCk7XG4gICAgICBjdHgudHJhbnNsYXRlKHQueCwgdC55KTtcbiAgICAgIGN0eC5zY2FsZSghdC5oZj8xOi0xLCAhdC52Zj8xOi0xKTtcbiAgICAgIGN0eC5kcmF3SW1hZ2UodC5pLCAtTWF0aC5zaWduKHQuaGYpKnQudywgLU1hdGguc2lnbih0LnZmKSp0LmgsIHQudywgdC5oKTtcbiAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfVxuICAgIC8vZHJhd0ltYWdlKHRoaXMuaSx0aGlzLngsdGhpcy55LCAxLCB0aGlzLnIpO1xuXG4gICAgaWYgKHQuclZpcyAmJiAhdC5pc1Zpcykge1xuICAgICAgY3R4LnNhdmUoKTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSB0LnJDb2w7XG4gICAgICBjdHguZmlsbFJlY3QodC54LHQueSx0LncsdC5oKTtcbiAgICAgIGN0eC5zdHJva2VTdHlsZT10LnJDb2w7XG4gICAgICBjdHguc3Ryb2tlUmVjdCh0LngsdC55LHQudyx0LmgpO1xuICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9XG5cbiAgICBpZiAodC5kbWcgPiAwKSB7XG4gICAgICBjdHguc2F2ZSgpO1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IHQuckNvbDtcbiAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IHQuZG1nICogMC42NTtcbiAgICAgIGN0eC5maWxsUmVjdCh0LngsdC55LHQudyx0LmgpO1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdC5yQ29sO1xuICAgICAgY3R4LnN0cm9rZVJlY3QodC54LHQueSx0LncsdC5oKTtcbiAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEUge1xuICBjb25zdHJ1Y3Rvcih4LHkpIHtcbiAgICBsZXQgdCA9IHRoaXM7XG4gICAgdC54PXg7XG4gICAgdC55PXk7XG4gICAgdC5heCA9IDA7XG4gICAgdC5heSA9IDA7XG4gICAgdC52eCA9IDA7XG4gICAgdC52eSA9IDA7XG4gICAgdC5ocD0xO1xuICAgIHQuZGVzcGF3bkRlbGF5ID0gNjAgKiAxMDsgXG4gICAgdC5kZXNwYXduVGljayA9IDA7XG4gIH1cblxuICBnZXRUaWxlKGFycikge1xuXG4gICAgbGV0IHRsID0gbnVsbDtcblxuICAgIGxldCB4ID0gc2dmKHRoaXMueCwgdGlsZVNpemUpIC8gdGlsZVNpemU7XG4gICAgbGV0IHkgPSBzZ2YodGhpcy55LCB0aWxlU2l6ZSkgLyB0aWxlU2l6ZTtcbiAgXG4gICAgaWYgKHRpbGVXaXRoaW5NYXAoeCwgeSkpIHtcbiAgICAgIHRsID0gYXJyW3hdW3ldO1xuICAgIH1cblxuICAgIHJldHVybiB0bDtcbiAgfVxuXG4gIGdldFRpbGVQb3MoKSB7XG5cbiAgICBsZXQgeCA9IHNnZih0aGlzLngsIHRpbGVTaXplKSAvIHRpbGVTaXplO1xuICAgIGxldCB5ID0gc2dmKHRoaXMueSwgdGlsZVNpemUpIC8gdGlsZVNpemU7XG5cbiAgICByZXR1cm4ge3g6eCx5Onl9O1xuICB9XG59XG5cbmNsYXNzIENsb3VkIGV4dGVuZHMgRSB7XG4gIGNvbnN0cnVjdG9yKHgseSx3LGgsaSkge1xuICAgIHN1cGVyKHgsIHkpO1xuICAgIGxldCB0ID0gdGhpcztcbiAgICB0LmkgPSBpO1xuICAgIHQudyA9IHc7XG4gICAgdC5oID0gaDtcbiAgICB0LnZ4ID0gLXJpbnQoMC4xLCAyKTtcbiAgICB0LmNhbkRlc3Ryb3kgPSAhMTtcbiAgfVxuXG4gIHVkKCkge1xuICAgIGxldCB0ID0gdGhpcztcbiAgICB0LnggKz0gdC52eDtcbiAgICB0LnkgKz0gdC52eTtcbiAgfVxuXG4gIGRyYXcoY3R4KSB7XG4gICAgbGV0IHQgPSB0aGlzO1xuICAgIGN0eC5kcmF3SW1hZ2UodC5pLCB0LngsIHQueSwgdC53LCB0LmgpO1xuICB9XG59XG5cbmNsYXNzIFBhcnQgZXh0ZW5kcyBFIHtcbiAgY29uc3RydWN0b3IoeCx5LHcsaCxpLGNvbCkge1xuICAgIHN1cGVyKHgsIHkpO1xuICAgIGxldCB0PXRoaXM7XG4gICAgdC5pPWk7XG4gICAgdC5jb2wgPSBjb2w7XG4gICAgdC53PXc7XG4gICAgdC5oPWg7XG4gICAgdC5kZWxheSA9IDkwO1xuICAgIHQudGljayA9IDA7XG4gICAgdC5nbmQ9ITE7XG4gICAgdC51c2VHcmF2aXR5ID0gITA7XG4gICAgdC5jYW5EZXN0cm95ID0gITE7XG4gIH1cblxuICBvd2MoZCkge1xuICB9XG5cbiAgdWQoKSB7XG4gICAgbGV0IHQ9dGhpcztcblxuICAgIGlmICh0LnRpY2sgPCB0LmRlbGF5KSB7XG4gICAgICB0LnRpY2srKztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0LmNhbkRlc3Ryb3kgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0LmduZCkge1xuICAgICAgdC52eSA9IDA7XG4gICAgfVxuXG4gICAgaWYgKHQudXNlR3Jhdml0eSAmJiB0LnZ5IDwgMTApIHtcbiAgICAgIHQudnkgKz0gZ3Jhdml0eTtcbiAgICB9XG5cbiAgICB0LnggKz0gdC52eDtcbiAgICB0LnkgKz0gdC52eTtcbiAgfVxuXG4gIGRyYXcoY3R4KSB7XG4gICAgbGV0IHQgPSB0aGlzO1xuXG4gICAgaWYgKHQuY29sKSB7XG4gICAgICBjdHguc2F2ZSgpO1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IHQuY29sO1xuICAgICAgY3R4LmZpbGxSZWN0KHQueCwgdC55LCB0LncsIHQuaCk7XG4gICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGN0eC5kcmF3SW1hZ2UodC5pLCB0LngsIHQueSwgdC53LCB0LmgpO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBQIGV4dGVuZHMgRSB7XG4gIGNvbnN0cnVjdG9yKHgseSxpKSB7XG4gICAgc3VwZXIoeCwgeSk7XG4gICAgbGV0IHQ9dGhpcztcbiAgICB0Lmk9aTtcbiAgICB0Lnc9MTA7XG4gICAgdC5oPTE0O1xuICAgIHQuc3BkPTE7XG4gICAgdC52eD0wO1xuICAgIHQudnk9MDtcbiAgICB0LmZyaWMgPSAwLjg7XG4gICAgdC5qbXA9ITE7XG4gICAgdC5nbmQ9ITE7XG4gICAgdC5kc2g9ITE7XG4gICAgdC5kcmxnPSExO1xuICAgIHQuZmMgPSBcIlJcIjtcbiAgICB0LnZ4bT0xOyAvLyB2ZWxvY2l0eSBtdWx0aXBsaWVyXG4gICAgdC5zZD05OTk5OTtcbiAgICB0LnN0PTA7XG4gICAgdC5lY3J5c3RhbD0wO1xuICAgIHQuYW1tbz0wO1xuICAgIHQuaXJvbj0wO1xuICAgIHQubWF4aHA9MztcbiAgICB0LmhwPTM7XG4gICAgdC5kZWFkPWZhbHNlO1xuICAgIHQuaW52aW5jPSExO1xuICAgIHQuaW52aW5jVGljaz0wO1xuICAgIHQuaW52aW5jRGVsYXk9MTIwO1xuICAgIHQudmlzaWJsZT10cnVlO1xuICAgIHQuY2hlYXRtb2RlPSExO1xuICAgIHQuYW5pbT1uZXcgQW5pbSgyLDAsOCk7XG4gIH1cblxuICBkYW1hZ2UoYW10KSB7XG4gICAgbGV0IHQgPSB0aGlzO1xuXG4gICAgaWYgKCF0LmludmluYyAmJiAhaGFzTGF1bmNoZWQpIHtcbiAgICAgIGlmICh0LmhwIC0gYW10ID4gMCkge1xuICAgICAgICB0LmhwIC09IGFtdDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0LmhwID0gMDtcbiAgICAgICAgdC5kZWFkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdC5pbnZpbmNUaWNrID0gMDtcbiAgICAgIHQuaW52aW5jID0gdHJ1ZTtcbiAgICB9XG5cbiAgfVxuXG4gIHVkKCkge1xuICAgIGxldCB0PXRoaXM7XG4gICAgXG4gICAgaWYgKCF0LmNoZWF0bW9kZSkge1xuXG4gICAgICBpZiAodC5nbmQpIHtcbiAgICAgICAgdC52eSA9IDA7XG4gICAgICB9XG5cbiAgICAgIGlmICh0LmRzaCkge1xuICAgICAgICB0LnZ4bT0yO1xuICAgICAgICB0LmFuaW0uZD00O1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHQudnhtPTE7XG4gICAgICAgIHQuYW5pbS5kPTg7XG4gICAgICB9XG5cbiAgICAgIHQudnggKj0gdC5mcmljO1xuICAgICAgaWYgKHQudnkgPCAxMCkge1xuICAgICAgICB0LnZ5ICs9IGdyYXZpdHk7XG4gICAgICB9XG5cbiAgICAgIGlmIChNYXRoLmFicyh0LnZ4KSA8IDAuMSApIHtcbiAgICAgICAgdC5hbmltLm9uPSExO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodC52eCA+PSAwLjUgfHwgdC52eCA8PSAtMC41KSB7XG4gICAgICAgIHQuYW5pbS5vbj0hMDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0LnZ4ICo9IHQuZnJpYztcbiAgICAgIHQudnkgKj0gdC5mcmljO1xuICAgIH1cblxuICAgIGlmIChoYXNMYXVuY2hlZCkge1xuICAgICAgdC52eCA9IDA7XG4gICAgICB0LnZ5ID0gMDtcbiAgICB9XG5cbiAgICB0LnggKz0gdC52eDtcbiAgICB0LnkgKz0gdC52eTtcblxuICAgIHQuYW5pbS51ZCgpO1xuXG4gICAgaWYgKHQuaW52aW5jKSB7XG4gICAgICBpZiAodC5pbnZpbmNUaWNrIDwgdC5pbnZpbmNEZWxheSkge1xuICAgICAgICB0LmludmluY1RpY2srKztcblxuICAgICAgICB0LnZpc2libGU9IXQudmlzaWJsZTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0LmludmluYyA9IGZhbHNlO1xuICAgICAgICB0LnZpc2libGUgPSB0cnVlO1xuXG4gICAgICAgIHQuaW52aW5jVGljayA9IDA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHQuZGVhZCkge1xuICAgICAgdC52aXNpYmxlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLypcbiAgICBpZiAodC54ID49IHctdC5pLncpIHtcbiAgICAgIHQueCA9IHctdC5pLnc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMueCA8PSAwKSB7XG4gICAgICB0aGlzLnggPSAwO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnkgPj0gaC10aGlzLmkuaCkge1xuICAgICAgdGhpcy55ID0gaC10aGlzLmkuaDtcbiAgICAgIHRoaXMuam1wID0gITE7XG4gICAgfSovXG5cbiAgfVxuXG4gIGRyYXcoY3R4KSB7XG5cbiAgICBsZXQgdCA9IHRoaXM7XG5cbiAgICAvL2RyYXdJbWFnZSh0aGlzLmksdGhpcy54LHRoaXMueSwxLHRoaXMucik7XG4gICAgY3R4LnNhdmUoKTtcblxuICAgIGxldCBvdmVycmlkZURyYXcgPSAhMTtcblxuICAgIGlmICh0LmRybGcpIHtcbiAgICAgIG92ZXJyaWRlRHJhdyA9ICEwO1xuICAgIH1cblxuICAgIGlmICghb3ZlcnJpZGVEcmF3ICYmIHQudmlzaWJsZSkge1xuICAgICAgaWYgKHQuZmMgPT0gJ0wnKSB7XG5cbiAgICAgICAgY3R4LnRyYW5zbGF0ZSh0LngsIHQueSk7XG4gICAgICAgIGN0eC5zY2FsZSgtMSwgMSk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodC5pLCB0LmFuaW0uZioxMCwwLDEwLDE2LC0xMCwgMCwxMCwxNik7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0LmZjID09ICdSJykge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHQuaSwgdC5hbmltLmYqMTAsMCwxMCwxNix0LngsIHQueSwgMTAsIDE2KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAodC5kcmxnICYmIHQuaWRybGcgIT09IHVuZGVmaW5lZCAmJiAhaGFzTGF1bmNoZWQpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0LmlkcmxnLCB0LngsIHQueSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY3R4LnJlc3RvcmUoKTtcbiAgfVxufVxuXG5jbGFzcyBQcm9qIGV4dGVuZHMgRSB7XG4gIGNvbnN0cnVjdG9yKHgseSxpLHZ4LHZ5LGZyaWVuZGx5KSB7XG4gICAgc3VwZXIoeCx5KTtcbiAgICBsZXQgdCA9IHRoaXM7XG4gICAgdC5pPWk7XG4gICAgdC53PWkud2lkdGg7XG4gICAgdC5oPWkuaGVpZ2h0O1xuICAgIHQudng9dng7XG4gICAgdC52eT12eTtcbiAgICB0LmZyaWVuZGx5PWZyaWVuZGx5O1xuICB9XG5cbiAgdWQoKXtcbiAgICBsZXQgdCA9IHRoaXM7XG5cbiAgICB0LnggKz0gdC52eDtcbiAgICB0LnkgKz0gdC52eTtcbiAgfVxuXG4gIGRyYXcoY3R4KXtcbiAgICBsZXQgdCA9IHRoaXM7XG4gICAgY3R4LmRyYXdJbWFnZSh0LmksIHQueCwgdC55KTtcbiAgfVxufVxuXG5jbGFzcyBTcGFjZXNoaXAgZXh0ZW5kcyBFIHtcbiAgY29uc3RydWN0b3IoeCwgeSwgdywgaCwgaSkge1xuICAgIHN1cGVyKHgsIHkpO1xuICAgIGxldCB0ID0gdGhpcztcbiAgICB0LncgPSB3O1xuICAgIHQuaCA9IGg7XG4gICAgdC5pID0gaTtcbiAgfVxuXG4gIHVkKCkge1xuICAgIGxldCB0ID0gdGhpcztcbiAgICB0LnZ4ICs9IHQuYXg7XG4gICAgdC52eSArPSB0LmF5O1xuXG4gICAgdC54ICs9IHQudng7XG4gICAgdC55ICs9IHQudnk7XG4gIH1cblxuICBkcmF3KGN0eCkge1xuICAgIGxldCB0ID0gdGhpcztcbiAgICAgIGN0eC5kcmF3SW1hZ2UodC5pLCB0LngsIHQueSwgdC53LCB0LmgpO1xuICB9XG59XG5cbmNsYXNzIEdyb3VuZE1vYiBleHRlbmRzIEUge1xuICBjb25zdHJ1Y3Rvcih4LHksdyxoLGksaXNBbmltLCBtZiwgZmQ9MzApIHtcbiAgICBzdXBlcih4LHkpO1xuICAgIGxldCB0ID0gdGhpcztcbiAgICB0Lmk9aTtcbiAgICB0Lnc9dztcbiAgICB0Lmg9aDtcbiAgICB0LmlzQW5pbT1pc0FuaW07XG4gICAgdC5mcmFtZT0wO1xuICAgIHQubWY9bWY7XG4gICAgdC5mZD1mZDtcbiAgICB0LmZ0PTA7XG4gICAgdC5mYz1cIlJcIjtcbiAgICB0LmduZD0hMTtcbiAgICB0LmptcD0hMTtcbiAgICB0LnZ4PTA7XG4gICAgdC52eT0wO1xuICAgIHQuZnI9MDtcbiAgfVxuXG4gIGJhc2V1cGRhdGUoKXtcbiAgICBsZXQgdCA9IHRoaXM7XG5cbiAgICBpZiAodC5nbmQpIHtcbiAgICAgIHQudnkgPSAwO1xuICAgIH1cblxuICAgIGlmICh0LnZ5IDwgMTApIHtcbiAgICAgIHQudnkgKz0gZ3Jhdml0eTtcbiAgICB9XG5cbiAgICB0LnggKz0gdC52eDtcbiAgICB0LnkgKz0gdC52eTtcblxuXG4gICAgaWYgKHQuZnQgPCB0LmZkKSB7XG4gICAgICB0LmZ0Kys7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKHQuZnJhbWUgPCB0Lm1mIC0gMSkge1xuICAgICAgICB0LmZyYW1lKys7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdC5mcmFtZSA9IDA7XG4gICAgICB9XG5cbiAgICAgIHQuZnQ9MDtcbiAgICB9XG5cbiAgfVxuXG4gIGRyYXcoY3R4KSB7XG4gICAgbGV0IHQgPSB0aGlzO1xuXG4gICAgY3R4LnNhdmUoKTtcblxuICAgIGlmICh0LmZyKSB7XG4gICAgICBjdHguZmlsdGVyID0gdC5mcjtcbiAgICB9XG5cbiAgICBpZiAodC5mYyA9PSAnUicpIHtcblxuICAgICAgY3R4LnRyYW5zbGF0ZSh0LngsIHQueSk7XG4gICAgICBjdHguc2NhbGUoLTEsIDEpO1xuICAgICAgaWYgKHQuaXNBbmltKSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodC5pLCB0LmZyYW1lICogdC53LCAwLCB0LncsIHQuaCwgLTE2LCAwLCB0LncsIHQuaCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0LmksIC0xMCwgMCwgdC53LCB0LmgpO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICh0LmZjID09ICdMJykge1xuICAgICAgaWYgKHQuaXNBbmltKSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodC5pLCB0LmZyYW1lICogdC53LCAwLCB0LncsIHQuaCwgdC54LCB0LnksIHQudywgdC5oKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHQuaSwgdC54LCB0LnksIHQudywgdC5oKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY3R4LnJlc3RvcmUoKTtcbiAgfVxufVxuXG5jbGFzcyBPb3J0QnVnIGV4dGVuZHMgR3JvdW5kTW9iIHtcbiAgY29uc3RydWN0b3IoeCx5LHcsaCxpKSB7XG4gICAgc3VwZXIoeCx5LHcsaCxpLCEwLDIsNCk7XG4gICAgbGV0IHQgPSB0aGlzO1xuICAgIHQudnggPSByaW50KDAsMTApID4gMSA/IC0xIDogMTtcbiAgICBpZiAoTWF0aC5zaWduKHRoaXMudngpID09IDEpIHtcbiAgICAgIHQuZmMgPSBcIlJcIjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0LmZjID0gXCJMXCI7XG4gICAgfVxuICAgIHQuZnI9cmludCgwLDEpPydodWUtcm90YXRlKCcrcmludCgwLDM2MCkrJ2RlZyknOjA7XG4gIH1cblxuICB1ZCgpIHtcbiAgICB0aGlzLmJhc2V1cGRhdGUoKTtcbiAgfVxuXG4gIG93YyhkKSB7XG4gICAgbGV0IHQgPSB0aGlzO1xuXG4gICAgdC52eCA9IC10LnZ4O1xuXG4gICAgdC52eSA9IC00O1xuICAgIHQuam1wID0gITA7XG4gICAgdC5nbmQgPSAhMTtcblxuICAgIGlmIChkID09ICdsJykge1xuICAgICAgdC5mYyA9ICdSJztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0LmZjID0gJ0wnO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhMihudW1yb3dzLCBudW1jb2xzLCBpbml0aWFsKVxue1xuICBhcnIgPSBbXTtcbiAgZm9yICggaSA9IDA7IGkgPCBudW1yb3dzOyArK2kpXG4gIHtcbiAgICBjb2x1bW5zID0gW107XG4gICAgZm9yICggaiA9IDA7IGogPCBudW1jb2xzOyArK2opXG4gICAge1xuICAgICAgY29sdW1uc1tqXSA9IGluaXRpYWw7XG4gICAgfVxuICAgIGFycltpXSA9IGNvbHVtbnM7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn1cblxuZnVuY3Rpb24gbGMoZm4sYW10PTApIHtcbiAgYz0wO1xuICBpZiAoYW10PjApIHtcbiAgICBjPVtdO1xuICAgIGZvciggaT0wO2k8YW10O2krKyl7XG4gICAgICBpbT1uZXcgSW1hZ2UoKTtcbiAgICAgIGltLnNyYz1pcitmbitpKycuZ2lmJztcbiAgICAgIGMucHVzaChpbSk7XG4gICAgfVxuICAgIHJldHVybiBjO1xuICB9XG4gIGVsc2Uge1xuICAgIGM9bmV3IEltYWdlKCk7XG4gICAgYy5zcmM9aXIrZm4rJy5naWYnO1xuICB9XG4gIHJldHVybiBjO1xufVxuXG5mdW5jdGlvbiBpbml0KCl7XG5cbiAgc3dpdGNoKHNjcmVlbikge1xuICAgIGNhc2UgMDoge1xuICAgICAgXG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSAxOiB7XG5cbiAgICAgIGlmIChtYXBQcmV2aWV3TW9kZSkge1xuICAgICAgICBjYW1lcmEuem9vbVRvKDUwMDApO1xuICAgICAgICBjYW1lcmEubW92ZVRvKChtYXB3ICogdGlsZVNpemUpLzIsIChtYXBoICogdGlsZVNpemUpLzIpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGNhbWVyYS56b29tVG8oMzAwKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHN1cmZhY2VMb2NhdGlvbnMgPSBbXTtcbiAgICAgIGxldCBmbG9vckxvY2F0aW9ucyA9IFtdO1xuXG4gICAgICBsZXQgdGVycmFpbkRpdmlzb3IgPSByaW50KDEwLCAyMDApO1xuICAgICAgbGV0IHRlcnJhaW5BbXBsaWZpZXIgPSByaW50KDUwLCA1MDApO1xuXG4gICAgICBmb3IoeHA9MDt4cDxiZ1RpbGVzLmxlbmd0aDt4cCsrKSB7XG4gICAgICAgIGxldCBwcmxuPU1hdGguZmxvb3IoKG1hcGggKiAwLjI1KSArIE1hdGgucG93KG5vaXNlLnBlcmxpbjIoeHAvdGVycmFpbkRpdmlzb3IsIDApLCAyKSAqIHRlcnJhaW5BbXBsaWZpZXIpO1xuXG4gICAgICAgIGZvcih5cD1wcmxuO3lwPG1hcGg7eXArKyl7XG5cbiAgICAgICAgICBjYW5BZGQ9ITA7XG5cbiAgICAgICAgICB0ZXh0dXJlID0gYmdfcm9ja3Nbd2xkdC5yb2NrSW5kZXhdO1xuXG4gICAgICAgICAgaWYgKHlwID4gbWFwaC0obWFwaC80KSkge1xuICAgICAgICAgICAgdGV4dHVyZSA9IGJnX2xhdmFyb2NrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBpZiAoY2FuQWRkKSB7XG4gICAgICAgICAgICBiZ1RpbGVzW3hwXVt5cF0gPSBuZXcgVGlsZSh4cCp0aWxlU2l6ZSx5cCp0aWxlU2l6ZSx0ZXh0dXJlLDApO1xuICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IHhwPTA7eHA8bWFwdzt4cCsrKSB7XG4gICAgICAgIGxldCBwcmxuPU1hdGguZmxvb3IoKG1hcGggKiAwLjI1KSArIE1hdGgucG93KG5vaXNlLnBlcmxpbjIoeHAvdGVycmFpbkRpdmlzb3IsIDApLCAyKSAqIHRlcnJhaW5BbXBsaWZpZXIpO1xuXG4gICAgICAgIGZvciAobGV0IHlwPXBybG47eXA8bWFwaCs2O3lwKyspIHtcblxuICAgICAgICAgIGxldCBjYW5BZGQ9ITA7XG4gICAgICAgICAgbGV0IGQ9MTA7XG4gICAgICAgICAgbGV0IGQyPTIwO1xuICAgICAgICAgIGxldCBkMz0yMDtcbiAgICAgICAgICBsZXQgdGV4dHVyZSA9IHJvY2tbd2xkdC5yb2NrSW5kZXhdO1xuICAgICAgICAgIGxldCBhcmdzID0ge1xuICAgICAgICAgICAgY2FuRmxpcDp0cnVlLFxuICAgICAgICAgICAgZGVzdHJ1Y3RpYmxlOnRydWUsXG4gICAgICAgICAgICBjb2xsaWRhYmxlOnRydWUsXG4gICAgICAgICAgICBkYW1hZ2U6bnVsbFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoeXAgPCBwcmxuICsgNikge1xuICAgICAgICAgICAgaWYgKHdsZHQuaGFzRGlydCkge1xuICAgICAgICAgICAgICB0ZXh0dXJlID0gZGlydDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHlwID09IHBybG4gJiYgd2xkdC5oYXNHcmFzcykge1xuICAgICAgICAgICAgICB0ZXh0dXJlID0gZ3Jhc3M7XG4gICAgICAgICAgICAgIGFyZ3MuY2FuRmxpcCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgIGlmIChyaW50KDAsIDEwMCkgPiA4MCkge1xuICAgICAgICAgICAgICAgIG1ha2VUcmVlKHhwLCB5cCwgbG9nLCByaW50KDgsIDEyKSwgdHJ1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHlwID09IHBybG4pIHtcbiAgICAgICAgICAgICAgaWYgKHRleHR1cmUgPT0gcm9ja1syXSkge1xuICAgICAgICAgICAgICAgIGlmIChyaW50KDAsIDEwMCkgPiA4MCkge1xuICAgICAgICAgICAgICAgICAgbWFrZVRyZWUoeHAsIHlwLCBjYWN0dXMsIHJpbnQoMiwgNiksIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHlwID09IHBybG4pIHtcbiAgICAgICAgICAgICAgaWYgKHRpbGVXaXRoaW5NYXAoeHAsIHlwIC0gMSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRpbGVzW3hwXVt5cCAtIDFdKSB7XG4gICAgICAgICAgICAgICAgICBzdXJmYWNlTG9jYXRpb25zLnB1c2goeyB4OiB4cCwgeTogeXAgLSAxIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh5cCA+IG1hcGgtKG1hcGgvNCkpIHtcbiAgICAgICAgICAgIHRleHR1cmUgPSBsYXZhcm9jaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBub2lzZS5zZWVkKHNlZWRzWzBdKTtcbiAgICAgICAgICBwMiA9IG5vaXNlLnBlcmxpbjIoeHAvZDIsIHlwL2QyKTtcblxuICAgICAgICAgIGlmIChwMiA+IDAuMDUgJiYgcDIgPCAwLjIpIHtcbiAgICAgICAgICAgIHRleHR1cmUgPSByb2NrYmx1ZTtcblxuICAgICAgICAgICAgaWYgKHlwID4gbWFwaC0obWFwaC80KSkge1xuICAgICAgICAgICAgICB0ZXh0dXJlID0gbGF2YTtcbiAgICAgICAgICAgICAgYXJncy5kZXN0cnVjdGlibGU9ZmFsc2U7XG4gICAgICAgICAgICAgIGFyZ3MuY29sbGlkYWJsZT1mYWxzZTtcbiAgICAgICAgICAgICAgYXJncy5kYW1hZ2U9MztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBub2lzZS5zZWVkKHNlZWRzWzFdKTtcbiAgICAgICAgICBwMyA9IG5vaXNlLnBlcmxpbjIoeHAvZDMsIHlwL2QzKTtcbiAgICAgICAgICBpZiAocDMgPiAwLjAyNSAmJiBwMyA8IDAuMykge1xuICAgICAgICAgICAgdGV4dHVyZSA9IG9pcm9uO1xuICAgICAgICAgICAgYXJncy5jb2xsaWRhYmxlPXRydWU7XG4gICAgICAgICAgICBhcmdzLmRlc3RydWN0aWJsZT10cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG5vaXNlLnNlZWQobXNlZWQpO1xuXG4gICAgICAgICAgaWYgKHlwID4gcHJsbisoTWF0aC5yYW5kb20oKSo1KSszICYmIG5vaXNlLnBlcmxpbjIoeHAvZCx5cC9kKSA+IDAuMSkge1xuICAgICAgICAgICAgY2FuQWRkID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGlmIChjYW5BZGQpIHtcbiAgICAgICAgICAgIHRsPW5ldyBUaWxlKHhwKnRpbGVTaXplLHlwKnRpbGVTaXplLHRleHR1cmUsYXJncyk7XG4gICAgICAgICAgICB0aWxlc1t4cF1beXBdID0gdGw7XG5cbiAgICAgICAgICAgIGlmICh0aWxlV2l0aGluTWFwKHhwLCB5cCAtIDEpKSB7XG4gICAgICAgICAgICAgIGlmICghdGlsZXNbeHBdW3lwIC0gMV0pIHtcbiAgICAgICAgICAgICAgICBmbG9vckxvY2F0aW9ucy5wdXNoKHsgeDogeHAsIHk6IHlwIC0gMSB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh5cCA+IG1hcGggLSByaW50KDYsOCkpIHtcbiAgICAgICAgICAgIHRpbGVzW3hwXVt5cF0gPSBuZXcgVGlsZSh4cCp0aWxlU2l6ZSx5cCp0aWxlU2l6ZSxiZWRyb2NrLHtcbiAgICAgICAgICAgICAgY2FuRmxpcDohMCxcbiAgICAgICAgICAgICAgZGVzdHJ1Y3RpYmxlOmZhbHNlLFxuICAgICAgICAgICAgICBjb2xsaWRhYmxlOiEwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgbGV0IHNvbGlkTm9GbGlwQXJncyA9IHtcbiAgICAgICAgY2FuRmxpcDogZmFsc2UsXG4gICAgICAgIGRlc3RydWN0aWJsZTogdHJ1ZSxcbiAgICAgICAgY29sbGlkYWJsZTogdHJ1ZVxuICAgICAgfTtcblxuICAgICAgZm9yICggaSA9IDA7IGkgPCA5OyBpKyspIHtcbiAgICAgICAgbGV0IGNyeXN0YWxMb2NJbmRleCA9IHJpbnQoMCxmbG9vckxvY2F0aW9ucy5sZW5ndGggLSAxKTtcbiAgICAgICAgbGV0IGxvYyA9IGZsb29yTG9jYXRpb25zW2NyeXN0YWxMb2NJbmRleF07XG4gICAgICAgIGZsb29yTG9jYXRpb25zLnNwbGljZShjcnlzdGFsTG9jSW5kZXgsIDEpO1xuXG4gICAgICAgIHRpbGVzW2xvYy54XVtsb2MueV0gPSBuZXcgVGlsZShsb2MueCp0aWxlU2l6ZSxsb2MueSp0aWxlU2l6ZSxlY3J5c3RhbCxzb2xpZE5vRmxpcEFyZ3MpO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmb3IgKCBpID0gMDsgaSA8IDU7IGkrKykge1xuICAgICAgICBsZXQgY2FuaXN0ZXJMb2MgPSBmbG9vckxvY2F0aW9uc1tyaW50KDAsZmxvb3JMb2NhdGlvbnMubGVuZ3RoIC0gMSldO1xuICAgICAgICBcbiAgICAgICAgdGlsZXNbY2FuaXN0ZXJMb2MueF1bY2FuaXN0ZXJMb2MueV0gPSBuZXcgVGlsZShjYW5pc3RlckxvYy54KnRpbGVTaXplLGNhbmlzdGVyTG9jLnkqdGlsZVNpemUsbGlmZWNhbmlzdGVyLHNvbGlkTm9GbGlwQXJncyk7XG4gICAgICB9XG5cblxuICAgICAgbGV0IHNwY3NoaXB4ID0gTWF0aC5mbG9vcihtYXB3LzIpO1xuXG4gICAgICBpZiAoIW1hcFByZXZpZXdNb2RlKSB7XG4gICAgICAgIHBsYXllciA9IG5ldyBQKHNwY3NoaXB4KnRpbGVTaXplLDEyOCxwbGF5ZXIpO1xuICAgICAgICBwbGF5ZXIuaWRybGcgPSBwbGF5ZXJfZHJpbGxpbmc7XG4gICAgICAgIHBsYXllcnMucHVzaChwbGF5ZXIpO1xuICAgICAgfVxuXG4gICAgICBsZXQgc3NoaXBMb2NhdGlvbiA9IHN1cmZhY2VMb2NhdGlvbnNbcmludCgwLCBzdXJmYWNlTG9jYXRpb25zLmxlbmd0aCAtIDEpXTtcblxuICAgICAgdGlsZXNbc3NoaXBMb2NhdGlvbi54XVtzc2hpcExvY2F0aW9uLnldID0gbmV3IFRpbGUoc3NoaXBMb2NhdGlvbi54KnRpbGVTaXplLHNzaGlwTG9jYXRpb24ueSp0aWxlU2l6ZSxzcGNzaGlwLHNvbGlkTm9GbGlwQXJncyk7XG5cbiAgICAgIHBsYXllci54PXNzaGlwTG9jYXRpb24ueCp0aWxlU2l6ZTtcbiAgICAgIHBsYXllci55PXNzaGlwTG9jYXRpb24ueSp0aWxlU2l6ZTtcblxuICAgICAgdGlsZXNbc3NoaXBMb2NhdGlvbi54XVtzc2hpcExvY2F0aW9uLnldLmRlc3RydWN0aWJsZSA9IGZhbHNlO1xuICAgICAgdGlsZXNbc3NoaXBMb2NhdGlvbi54XVtzc2hpcExvY2F0aW9uLnkgKyAxXS5kZXN0cnVjdGlibGUgPSBmYWxzZTtcblxuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG5mdW5jdGlvbiB1ZCgpe1xuXG4gIGlmIChzcGFjZXNoaXApIHtcbiAgICBzcGFjZXNoaXAudWQoKTtcbiAgfVxuXG4gIGlmIChwbGF5ZXJzLmxlbmd0aD4wKSB7XG5cbiAgICB3Y2FtID0geyB4OiBjYW1lcmEudnAubGYsIHk6IGNhbWVyYS52cC50cCB9O1xuICAgIHNuYyA9IHtcbiAgICAgIGxmOiBzZ2Yod2NhbS54LCB0aWxlU2l6ZSkvdGlsZVNpemUsXG4gICAgICB0cDogc2dmKHdjYW0ueSwgdGlsZVNpemUpL3RpbGVTaXplLFxuICAgICAgdzogKHNnZihjYW1lcmEudnAudywgdGlsZVNpemUpL3RpbGVTaXplKSsyLFxuICAgICAgaDogKHNnZihjYW1lcmEudnAuaCwgdGlsZVNpemUpL3RpbGVTaXplKSsyXG4gICAgfTtcblxuICAgIGxldCBwbGF5ZXIgPSBwbGF5ZXJzWzBdO1xuXG4gICAgaWYgKCFwbGF5ZXIuZGVhZCkge1xuICAgICAgaWYgKGtbOTBdKSB7IC8vIGp1bXBcblxuICAgICAgICBtb3ZlZFRpY2srKztcblxuICAgICAgICBpZiAoIXBsYXllci5jaGVhdG1vZGUpIHtcbiAgICAgICAgICBpZiAoIXBsYXllci5qbXAgJiYgcGxheWVyLmduZCkge1xuICAgICAgICAgICAgcGxheWVyLmptcCA9ICEwO1xuICAgICAgICAgICAgcGxheWVyLmduZCA9ICExO1xuICAgICAgICAgICAgcGxheWVyLnZ5ID0gLTQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBsYXllci5jaGVhdG1vZGUpIHtcbiAgICAgICAgICBpZiAocGxheWVyLnZ5ID4gLXBsYXllci5zcGQpIHtcbiAgICAgICAgICAgIHBsYXllci52eS0tO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoa1s0MF0pIHsgLy8gZG93blxuICAgICAgICBwbGF5ZXIuZHJsZyA9ICEwO1xuXG4gICAgICAgIG1vdmVkVGljaysrO1xuXG4gICAgICAgIGlmIChwbGF5ZXIuY2hlYXRtb2RlKSB7XG4gICAgICAgICAgaWYgKHBsYXllci52eSA8IHBsYXllci5zcGQpIHtcbiAgICAgICAgICAgIHBsYXllci52eSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcGxheWVyLmRybGcgPSAhMTtcbiAgICAgIH1cblxuICAgICAgaWYgKGtbMzldKSB7IC8vIHJpZ2h0XG5cbiAgICAgICAgbW92ZWRUaWNrKys7XG4gICAgICAgIFxuICAgICAgICBpZiAocGxheWVyLnZ4IDwgcGxheWVyLnNwZCAqIHBsYXllci52eG0pIHtcbiAgICAgICAgICBwbGF5ZXIudngrKztcbiAgICAgICAgICBwbGF5ZXIuZmMgPSBcIlJcIjtcbiAgICAgICAgfVxuXG4gICAgICB9XG5cbiAgICAgIGlmIChrWzM3XSkgeyAvLyBsZWZ0XG5cbiAgICAgICAgbW92ZWRUaWNrKys7XG5cbiAgICAgICAgaWYgKHBsYXllci52eCA+IC1wbGF5ZXIuc3BkICogcGxheWVyLnZ4bSkge1xuICAgICAgICAgIHBsYXllci52eC0tO1xuICAgICAgICAgIHBsYXllci5mYyA9IFwiTFwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChrWzg4XSkge1xuXG4gICAgICAgIHBsYXllci5kc2ggPSB0cnVlO1xuXG4gICAgICAgIG1vdmVkVGljaysrO1xuXG4gICAgICAgIGlmIChwbGF5ZXIuc3QgPCBwbGF5ZXIuc2QpIHtcbiAgICAgICAgICBwbGF5ZXIuc3QrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAocGxheWVyLmFtbW8+MCYmIXBsYXllci5kcmxnKSB7XG4gICAgICAgICAgICAvLyBwbGF5ZXIgc2hvb3RcbiAgICAgICAgICAgIGxldCB2eD0wO1xuICAgICAgICAgICAgaWYgKHBsYXllci5mYyA9PSBcIkxcIikge1xuICAgICAgICAgICAgICB2eCA9IC01O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHZ4ID0gNTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBwcm9qID0gbmV3IFByb2oocGxheWVyLngscGxheWVyLnkrNyxwbGFzbWFiYWxsLHZ4LDAsdHJ1ZSk7XG4gICAgICAgICAgICBwcm9qcy5wdXNoKHByb2opO1xuXG4gICAgICAgICAgICBwbGF5ZXIuYW1tby0tO1xuXG4gICAgICAgICAgICBwbGF5ZXIuc3Q9MDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBwbGF5ZXIuZHNoPSExO1xuICAgICAgICBwbGF5ZXIuc3Q9cGxheWVyLnNkLTE7XG4gICAgICB9XG5cbiAgICAgIGlmIChrWzM4XSkgeyAvLyB1cFxuICAgICAgICBsZXQgZnRsID0gcGxheWVyLmdldFRpbGUoZmdUaWxlcyk7XG4gICAgICAgIGxldCB0bHAgPSBwbGF5ZXIuZ2V0VGlsZVBvcygpO1xuXG4gICAgICAgIGlmIChmdGwpIHtcbiAgICAgICAgICBpZiAoZnRsLmkgPT0gbGFkZGVyKSB7XG4gICAgICAgICAgICBwbGF5ZXIudnk9LTI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBsYWNleT1udWxsO1xuICAgICAgICBmb3IgKCB5ID0gdGxwLnk7IHkgPiAwOyB5LS0pIHtcblxuICAgICAgICAgIGlmICh0aWxlV2l0aGluTWFwKHRscC54LCB0bHAueSkpIHtcbiAgICAgICAgICAgIGlmICh0aWxlc1t0bHAueF1beV0gPT0gbnVsbCAmJiAhcGxhY2V5KSB7XG4gICAgICAgICAgICAgIHBsYWNleT15O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwbGFjZXkgJiYgcGxheWVyLmlyb24+MCkge1xuICAgICAgICAgIGlmICghZmdUaWxlc1t0bHAueF1bcGxhY2V5XSkge1xuICAgICAgICAgICAgZmdUaWxlc1t0bHAueF1bcGxhY2V5XSA9IG5ldyBUaWxlKHRscC54KnRpbGVTaXplLHBsYWNleSp0aWxlU2l6ZSxsYWRkZXIse1xuICAgICAgICAgICAgICBjYW5GbGlwOiExXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcGxheWVyLmlyb24tLTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKCBpPTA7aTxwbGF5ZXJzLmxlbmd0aDtpKyspIHtcbiAgICAgIHBsYXllci51ZCgpO1xuICAgIH1cblxuXG4gICAgcGxheWVyLmduZCA9ICExO1xuXG4gICAgLy8gY2xvdWQgc3Bhd25lclxuICAgIGlmIChzcGF3bkNsb3VkVGljayA8IHNwYXduQ2xvdWREZWxheSkge1xuICAgICAgc3Bhd25DbG91ZFRpY2srKztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBsZXQgY2xvdWQgPSBuZXcgQ2xvdWQodywgcmludCgwLCBoKSwgcmludCg2NCwgMjU2KSwgcmludCgzMiwgNjQpLCBjbG91ZF9pbWdzW3JpbnQoMCxjbG91ZF9pbWdzLmxlbmd0aC0xKV0pO1xuICAgICAgY2xvdWRzLnB1c2goY2xvdWQpO1xuXG4gICAgICBzcGF3bkNsb3VkVGljayA9IDA7XG4gICAgfVxuXG4gICAgLy8gbW9iIHNwYXduZXJcbiAgICBcbiAgICBpZiAoc3Bhd25UaWNrIDwgc3Bhd25EZWxheSkge1xuICAgICAgc3Bhd25UaWNrKys7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbGV0IGxvY2F0aW9ucyA9IFtdO1xuXG4gICAgICB3aXRoaW5DYW1Mb29wKHNuYywgZnVuY3Rpb24oeHAsIHlwKSB7XG4gICAgICAgIGlmICh0aWxlV2l0aGluTWFwKHhwLCB5cCkpIHtcbiAgICAgICAgICBsZXQgdGwgPSB0aWxlc1t4cF1beXBdO1xuXG4gICAgICAgICAgaWYgKHRsICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmICh5cCAtIDEgPj0gMCkge1xuICAgICAgICAgICAgICBpZiAodGlsZXNbeHBdW3lwIC0gMV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGxvY2F0aW9ucy5wdXNoKHsgeDogeHAsIHk6IHlwIC0gMSB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChtb2JzLmxlbmd0aCA8IDUwKSB7XG4gICAgICAgIGxldCBsb2NhdGlvbiA9IGxvY2F0aW9uc1tyaW50KDAsIGxvY2F0aW9ucy5sZW5ndGggLSAxKV07XG5cbiAgICAgICAgaWYgKGxvY2F0aW9uKSB7XG4gICAgICAgICAgaWYgKGRpc3RhbmNlKFxuICAgICAgICAgICAgcGxheWVyLngsXG4gICAgICAgICAgICBwbGF5ZXIueSxcbiAgICAgICAgICAgIGxvY2F0aW9uLnggKiB0aWxlU2l6ZSxcbiAgICAgICAgICAgIGxvY2F0aW9uLnkgKiB0aWxlU2l6ZVxuICAgICAgICAgICkgPiA3MCkge1xuICAgICAgICAgICAgbGV0IHRleHR1cmUgPSBvb3J0YnVnO1xuICAgICAgICAgICAgbGV0IHdpZHRoID0gMTY7XG4gICAgICAgICAgICBsZXQgaGVpZ2h0ID0gMTI7XG5cbiAgICAgICAgICAgIGlmIChyaW50KDAsIDEwKSA+PSA1KSB7XG4gICAgICAgICAgICAgIHRleHR1cmUgPSBzbHVnZ2VyO1xuICAgICAgICAgICAgICBoZWlnaHQ9ODtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBtb2IgPSBuZXcgT29ydEJ1Zyhsb2NhdGlvbi54KnRpbGVTaXplLGxvY2F0aW9uLnkqdGlsZVNpemUsd2lkdGgsaGVpZ2h0LHRleHR1cmUpO1xuXG4gICAgICAgICAgICBtb2JzLnB1c2gobW9iKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBcbiAgICAgIHNwYXduVGljaz0wO1xuICAgIH1cblxuICAgIGNsb3VkcyA9IGNsb3Vkcy5maWx0ZXIoKGNsb3VkKSA9PiB7XG4gICAgICByZXR1cm4gIWNsb3VkLmNhbkRlc3Ryb3k7XG4gICAgfSk7XG5cbiAgICBmb3IgKCBpID0gMDsgaSA8IGNsb3Vkcy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGNsb3VkID0gY2xvdWRzW2ldO1xuXG4gICAgICBpZiAoY2xvdWQueCA8IC1jbG91ZC53KSB7XG4gICAgICAgIGNsb3VkLmNhbkRlc3Ryb3kgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBjbG91ZC52eSA9IC1wbGF5ZXJzWzBdLnZ5KmJnUGFyYWxsYXg7XG5cbiAgICAgIGNsb3VkLnVkKCk7XG4gICAgfVxuXG4gICAgcGFydHMgPSBwYXJ0cy5maWx0ZXIoKHBhcnQpID0+IHtcbiAgICAgIHJldHVybiAhcGFydC5jYW5EZXN0cm95XG4gICAgfSk7XG5cbiAgICBmb3IgKCBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgcGFydCA9IHBhcnRzW2ldO1xuICAgICAgcGFydC51ZCgpO1xuXG4gICAgICBsZXQgdHAgPSBwYXJ0LmdldFRpbGVQb3MoKTtcbiAgICAgIGZvciAoIHhwID0gdHAueCAtIDM7IHhwIDwgdHAueCArIDM7IHhwKyspIHtcbiAgICAgICAgZm9yICggeXAgPSB0cC55IC0gMzsgeXAgPCB0cC55ICsgMzsgeXArKykge1xuXG4gICAgICAgICAgaWYgKHRpbGVXaXRoaW5NYXAoeHAsIHlwKSkge1xuICAgICAgICAgICAgdCA9IHRpbGVzW3hwXVt5cF07XG5cbiAgICAgICAgICAgIGlmICh0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGlmICh0LmNvbGxpZGFibGUpIHtcbiAgICAgICAgICAgICAgICBkID0gY29sQ2hlY2socGFydCwgdCk7XG4gICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGQgPT09IFwiYnNcIikge1xuICAgICAgICAgICAgICAgICAgcGFydC5nbmQgPSAhMDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIWQpIHtcbiAgICAgICAgICAgICAgICAgIHBhcnQuZ25kID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yICggaSA9IDA7IGkgPCBtb2JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBtb2IgPSBtb2JzW2ldO1xuICAgICAgbW9iLnVkKCk7XG5cbiAgICAgIG1vYi5nbmQgPSAhMTtcblxuICAgICAgaWYgKHBsYXllci54ICsgcGxheWVyLncgPiBtb2IueCAmJlxuICAgICAgICAgIHBsYXllci54IDwgbW9iLnggKyBtb2IudyAmJlxuICAgICAgICAgIHBsYXllci55ICsgcGxheWVyLmggPiBtb2IueSAmJlxuICAgICAgICAgIHBsYXllci55IDwgbW9iLnkgKyBtb2IuaCkge1xuXG4gICAgICBcbiAgICAgICAgaWYgKHBsYXllci52eSA+PSAwICYmIHBsYXllci55ICsgcGxheWVyLmggPCBtb2IueSArIChtb2IuaC8yKSl7XG4gICAgICAgICAgcGxheWVyLmptcCA9ICEwO1xuICAgICAgICAgIHBsYXllci5nbmQgPSAhMTtcbiAgICAgICAgICBpZiAocGxheWVyLmptcCkge1xuICAgICAgICAgICAgcGxheWVyLnZ5ID0gLXBsYXllci5zcGQgKiA0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHBsYXllci52eSA9IC1wbGF5ZXIuc3BkICogMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgbW9icy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbGV0IGQgPSBjb2xSZWN0KHBsYXllciwgbW9iKTtcblxuICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGFtYWdlKDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9XG5cbiAgICAgIHRwID0gbW9iLmdldFRpbGVQb3MoKTtcbiAgICAgIGZvciAoIHhwID0gdHAueCAtIDM7IHhwIDwgdHAueCArIDM7IHhwKyspIHtcbiAgICAgICAgZm9yICggeXAgPSB0cC55IC0gMzsgeXAgPCB0cC55ICsgMzsgeXArKykge1xuXG4gICAgICAgICAgaWYgKHRpbGVXaXRoaW5NYXAoeHAsIHlwKSkge1xuICAgICAgICAgICAgdCA9IHRpbGVzW3hwXVt5cF07XG5cbiAgICAgICAgICAgIGlmICh0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGlmICh0LmNvbGxpZGFibGUpIHtcbiAgICAgICAgICAgICAgICBkID0gY29sQ2hlY2sobW9iLCB0KTtcbiAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZCA9PT0gXCJsXCIgfHwgZCA9PT0gXCJyXCIpIHtcbiAgICAgICAgICAgICAgICAgIG1vYi5vd2MoZCk7XG4gICAgICAgICAgICAgICAgICBtb2Iuam1wID0gITE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkID09PSBcImJzXCIpIHtcbiAgICAgICAgICAgICAgICAgIG1vYi5nbmQgPSAhMDtcbiAgICAgICAgICAgICAgICAgIG1vYi5qbXAgPSAhMTtcbiAgICAgICAgICAgICAgICAgIG1vYi52eSAqPSAtMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICBtb2IueCA8IHNuYy5sZiAqIHRpbGVTaXplIHx8XG4gICAgICAgIG1vYi54ID4gKHNuYy5sZiArIHNuYy53KSAqIHRpbGVTaXplIHx8XG4gICAgICAgIG1vYi55IDwgc25jLnRwICogdGlsZVNpemUgfHxcbiAgICAgICAgbW9iLnkgPiAoc25jLnRwICsgc25jLmgpICogdGlsZVNpemVcbiAgICAgICkge1xuXG4gICAgICAgIGlmIChtb2IuZGVzcGF3blRpY2sgPCBtb2IuZGVzcGF3bkRlbGF5KSB7XG4gICAgICAgICAgbW9iLmRlc3Bhd25UaWNrKys7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbW9icy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cblxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG1vYi5kZXNwYXduVGljayA9IDA7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZvciAoIGogPSAwOyBqIDwgcHJvanMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKGNvbFJlY3QocHJvanNbal0sIG1vYikpIHtcblxuICAgICAgICAgIGxldCBwYXJ0ID0gbmV3IFBhcnQoXG4gICAgICAgICAgICBwcm9qc1tqXS54LFxuICAgICAgICAgICAgcHJvanNbal0ueSxcbiAgICAgICAgICAgIDgsXG4gICAgICAgICAgICA4LFxuICAgICAgICAgICAgaGl0XG4gICAgICAgICAgKTtcbiAgICAgICAgICBwYXJ0LmRlbGF5ID0gMjtcbiAgICAgICAgICBwYXJ0LnVzZUdyYXZpdHkgPSBmYWxzZTtcbiAgICAgICAgICBcbiAgICAgICAgICBwYXJ0cy5wdXNoKHBhcnQpO1xuXG4gICAgICAgICAgbW9icy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgcHJvanMuc3BsaWNlKGosIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IHByb2pzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwcm9qc1tpXS51ZCgpO1xuICAgIH1cblxuICAgIHdpdGhpbkNhbUxvb3Aoc25jLCAoeHAsIHlwKSA9PiB7ICAgICAgICAgIFxuICAgICAgdGwgPSB0aWxlc1t4cF1beXBdO1xuICAgICAgICBcbiAgICAgIGlmICh0bCAhPT0gbnVsbCkge1xuXG4gICAgICAgIHRsLnVkKCk7XG5cbiAgICAgICAgaWYgKHRsLmkgPT0gZ3Jhc3MpIHtcbiAgICAgICAgICBsZXQgYXJncyA9IHtcbiAgICAgICAgICAgIGNhbkZsaXA6ZmFsc2UsXG4gICAgICAgICAgICBkZXN0cnVjdGlibGU6dHJ1ZSxcbiAgICAgICAgICAgIGNvbGxpZGFibGU6dHJ1ZVxuICAgICAgICAgIH07XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKHhwLTEgPj0gMCkge1xuICAgICAgICAgICAgbGV0IHRsbGYgPSB0aWxlc1t4cC0xXVt5cF07XG4gICAgICAgICAgICBpZiAodGxsZikge1xuICAgICAgICAgICAgICBpZiAodGxsZi5pID09IGRpcnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlzVGlsZUFib3ZlKHhwLTEsIHlwKSkge1xuICAgICAgICAgICAgICAgICAgaWYgKCF0aWxlc1t4cC0xXVt5cC0xXSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmludCgwLCAxMDAwMCkgPiA5OTUwKVxuICAgICAgICAgICAgICAgICAgICAgIHRpbGVzW3hwLTFdW3lwXSA9IG5ldyBUaWxlKCh4cC0xKSp0aWxlU2l6ZSx5cCp0aWxlU2l6ZSxncmFzcyxhcmdzKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoeHArMSA8IG1hcHcpIHtcbiAgICAgICAgICAgIGxldCB0bHJ0ID0gdGlsZXNbeHArMV1beXBdO1xuICAgICAgICAgICAgaWYgKHRscnQpIHtcbiAgICAgICAgICAgICAgaWYgKHRscnQuaSA9PSBkaXJ0KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1RpbGVBYm92ZSh4cCsxLCB5cCkpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghdGlsZXNbeHArMV1beXAtMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJpbnQoMCwgMTAwMDApID4gOTk1MClcbiAgICAgICAgICAgICAgICAgICAgICB0aWxlc1t4cCsxXVt5cF0gPSBuZXcgVGlsZSgoeHArMSkqdGlsZVNpemUseXAqdGlsZVNpemUsZ3Jhc3MsYXJncyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRsLmkgPT0gbGF2YSAmJiB0bC5lbGFwc2VkICUgMTIwID09IDApIHtcbiAgICAgICAgICBsZXQgYXJncyA9IHtcbiAgICAgICAgICAgIGNhbkZsaXA6dHJ1ZSxcbiAgICAgICAgICAgIGRlc3RydWN0aWJsZTpmYWxzZSxcbiAgICAgICAgICAgIGNvbGxpZGFibGU6ZmFsc2VcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKHlwKzEgPCBtYXBoKSB7XG4gICAgICAgICAgICBsZXQgdGxib3QgPSB0aWxlc1t4cF1beXArMV07XG4gICAgICAgICAgICBpZiAoIXRsYm90KSB7XG4gICAgICAgICAgICAgIHRpbGVzW3hwXVt5cCsxXSA9IG5ldyBUaWxlKHhwKnRpbGVTaXplLCh5cCsxKSp0aWxlU2l6ZSxsYXZhLGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh5cCArIDEgPCBtYXBoKSB7XG4gICAgICAgICAgaWYgKGdldFRpbGVUeXBlKHRsKSA9PSBcInJvY2tcIiAmJlxuICAgICAgICAgICAgICB0bC5pICE9PSByb2NrWzJdKSB7XG4gICAgICAgICAgICBpZiAoIXRpbGVzW3hwXVt5cCArIDFdKSB7XG4gICAgICAgICAgICAgIGlmIChyaW50KDAsIDEwMDAwKSA+IDk5OTApIHtcbiAgICAgICAgICAgICAgICBsZXQgcGFydCA9IG5ldyBQYXJ0KFxuICAgICAgICAgICAgICAgICAgcmludCh0bC54IC0gMiwgdGwueCArIHRsLncgKyAyKSxcbiAgICAgICAgICAgICAgICAgIHRsLnkgKyB0bC5oICsgMixcbiAgICAgICAgICAgICAgICAgIDQsXG4gICAgICAgICAgICAgICAgICA0LFxuICAgICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICAgIFwiIzQ0NDRGRlwiXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHBhcnQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGlmICh0bC5pID09IHJvY2tbMl0pIHtcbiAgICAgICAgICAgIGlmICghdGlsZXNbeHBdW3lwICsgMV0pIHtcbiAgICAgICAgICAgICAgaWYgKHJpbnQoMCwgMTAwMDApID4gcmludCg5ODAwLCA5OTkwKSkge1xuICAgICAgICAgICAgICAgIGxldCBwYXJ0ID0gbmV3IFBhcnQoXG4gICAgICAgICAgICAgICAgICByaW50KHRsLnggLSAyLCB0bC54ICsgdGwudyArIDIpLFxuICAgICAgICAgICAgICAgICAgdGwueSArIHRsLmgsXG4gICAgICAgICAgICAgICAgICA0LFxuICAgICAgICAgICAgICAgICAgNCxcbiAgICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgICBcIiNmZmUzYTZcIlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgcGFydC51c2VHcmF2aXR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcGFydC52eSA9IDAuMTtcbiAgICAgICAgICAgICAgICBwYXJ0LmRlbGF5ID0gcmludCgxMjAsIDEyMDApO1xuICAgICAgICAgICAgICAgIHBhcnRzLnB1c2gocGFydCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGwuaSA9PSBzcGNzaGlwKSB7XG4gICAgICAgICAgaWYgKHBsYXllci5lY3J5c3RhbCA+PSAxKSB7XG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UoXG4gICAgICAgICAgICAgIHBsYXllci54LFxuICAgICAgICAgICAgICBwbGF5ZXIueSxcbiAgICAgICAgICAgICAgdGwueCxcbiAgICAgICAgICAgICAgdGwueVxuICAgICAgICAgICAgKSA8IDMyKSB7XG5cbiAgICAgICAgICAgICAgdGwuZG1nID0gMTAwO1xuXG4gICAgICAgICAgICAgIHNwYWNlc2hpcCA9IG5ldyBTcGFjZXNoaXAoeHAqdGlsZVNpemUsIHlwKnRpbGVTaXplLCB0aWxlU2l6ZSwgdGlsZVNpemUsIHNwY3NoaXApO1xuICAgICAgICAgICAgICBzcGFjZXNoaXAuYXkgPSAtMC4wMTtcblxuICAgICAgICAgICAgICBwbGF5ZXIudmlzaWJsZT1mYWxzZTtcbiAgICAgICAgICAgICAgY2FtZXJhLm1vdmVUbyhzcGFjZXNoaXAueCwgc3BhY2VzaGlwLnkpO1xuICAgICAgICAgICAgICBoYXNMYXVuY2hlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRsLmNvbGxpZGFibGUpIHtcbiAgICAgICAgICBkID0gY29sQ2hlY2socGxheWVyLCB0bCk7XG5cbiAgICAgICAgICBsZXQgZG1nID0gMC4wNTtcblxuICAgICAgICAgIGlmICh0bC5pID09IHJvY2tibHVlKSB7XG4gICAgICAgICAgICBkbWcgPSAwLjU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGQgPT09IFwibFwiIHx8IGQgPT09IFwiclwiKSB7XG4gICAgICAgICAgICBwbGF5ZXIudnggPSAwO1xuICAgICAgICAgICAgcGxheWVyLmptcCA9ICExO1xuICAgICAgICAgICAgcGxheWVyLmFuaW0uZD05OTk5O1xuXG4gICAgICAgICAgICB0bC5oaXQoZG1nLCBkKTtcblxuICAgICAgICAgIH0gZWxzZSBpZiAoZCA9PT0gXCJic1wiKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZ25kID0gITA7XG4gICAgICAgICAgICBwbGF5ZXIuam1wID0gITE7XG5cbiAgICAgICAgICAgIGlmIChwbGF5ZXIuZHJsZykge1xuICAgICAgICAgICAgICB0bC5oaXQoZG1nLCBkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHBsYXllci52eSA+IDgpIHtcbiAgICAgICAgICAgICAgcGxheWVyLmRhbWFnZShNYXRoLnJvdW5kKHBsYXllci52eSAqIDAuMSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIGlmIChkID09PSBcInRcIikge1xuICAgICAgICAgICAgcGxheWVyLnZ5ICo9IC0xO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0bC5kYW1hZ2UgIT0gbnVsbCkge1xuICAgICAgICAgIGlmIChjb2xSZWN0KHBsYXllciwgdGwpKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGFtYWdlKHRsLmRhbWFnZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGwuZG1nID4gMCkge1xuICAgICAgICAgIHRsLmRtZyAtPSAwLjAwMTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRsLmRtZyA+PSAxKSB7XG5cbiAgICAgICAgICBpZiAodGwuaSA9PSByb2NrYmx1ZSkge1xuICAgICAgICAgICAgcGxheWVyLmFtbW8gKz0gMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAodGwuaSA9PSBvaXJvbikge1xuICAgICAgICAgICAgbGV0IGFtdCA9IDE7XG4gICAgICAgICAgICBhbXQgPSByaW50KDAsMTAwKT44MD9yaW50KDIsMyk6YW10O1xuICAgICAgICAgICAgcGxheWVyLmlyb24gKz0gYW10O1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmICh0bC5pID09IGxpZmVjYW5pc3Rlcikge1xuICAgICAgICAgICAgcGxheWVyLm1heGhwICs9IDE7XG4gICAgICAgICAgICBwbGF5ZXIuaHAgPSBwbGF5ZXIubWF4aHA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKHRsLmkgPT0gZWNyeXN0YWwpIHtcbiAgICAgICAgICAgIHBsYXllci5lY3J5c3RhbCArPSAxO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRpbGVzW3hwXVt5cF0gPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBwbGF5ZXJzWzBdLnggPSBjbGFtcChwbGF5ZXJzWzBdLngsIDAsIChtYXB3KnRpbGVTaXplKS1wbGF5ZXJzWzBdLncpO1xuICAgIHBsYXllcnNbMF0ueSA9IGNsYW1wKHBsYXllcnNbMF0ueSwgMCwgKG1hcGgqdGlsZVNpemUpLXBsYXllcnNbMF0uaCArIDEyOCk7XG5cbiAgICBpZiAocGxheWVyc1swXS55ID4gbWFwaCAqIHRpbGVTaXplKSB7XG4gICAgICBwbGF5ZXJzWzBdLmRhbWFnZSg1MCk7XG4gICAgfVxuXG4gICAgaWYgKGhhc0xhdW5jaGVkKSB7XG4gICAgICBpZiAoc3BhY2VzaGlwKSB7XG4gICAgICAgIGNhbWVyYS5tb3ZlVG8oc3BhY2VzaGlwLngsIHNwYWNlc2hpcC55KTtcblxuICAgICAgICBsZXQgY29sb3JzID0gW1xuICAgICAgICAgIFwiI2ZmYjAxMlwiLFxuICAgICAgICAgIFwiI2ZmYjAxMlwiLFxuICAgICAgICAgIFwiI2ZmZmZmZlwiXG4gICAgICAgIF1cbiAgICAgICAgbGV0IGNvbG9yID0gY29sb3JzW3JpbnQoMCwgY29sb3JzLmxlbmd0aCAtIDEpXTtcbiAgICAgICAgbGV0IHNpemUgPSByaW50KDIsIDE2KTtcblxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICAgIGxldCBwYXJ0ID0gbmV3IFBhcnQoXG4gICAgICAgICAgICByaW50KHNwYWNlc2hpcC54IC0gNCwgc3BhY2VzaGlwLnggKyBzcGFjZXNoaXAudyAtIDgpLFxuICAgICAgICAgICAgcmludChzcGFjZXNoaXAueSArIHNwYWNlc2hpcC5oLCBzcGFjZXNoaXAueSArIHNwYWNlc2hpcC5oICsgMzIpLFxuICAgICAgICAgICAgc2l6ZSxcbiAgICAgICAgICAgIHNpemUsXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgY29sb3JcbiAgICAgICAgICApO1xuICAgICAgICAgIHBhcnQuZGVsYXkgPSAxNTtcbiAgICAgICAgICBwYXJ0LnZ5ID0gcmludCgwLCA1KTtcbiAgICAgICAgICBwYXJ0cy5wdXNoKHBhcnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKG1hcFByZXZpZXdNb2RlKSB7XG4gICAgICAgIGNhbWVyYS5tb3ZlVG8oKG1hcHcgKiB0aWxlU2l6ZSkvMiwgKG1hcGggKiB0aWxlU2l6ZSkvMik7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcHBvcz0geyB4OiBwbGF5ZXJzWzBdLngsIHk6IHBsYXllcnNbMF0ueSB9O1xuICAgICAgICBjYW1lcmEubW92ZVRvKE1hdGgucm91bmQocHBvcy54KSwgTWF0aC5yb3VuZChwcG9zLnkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY2FtZXJhLnZwLmxmID0gY2xhbXAoY2FtZXJhLnZwLmxmLCAwLCAobWFwdyp0aWxlU2l6ZSkgLSBjYW1lcmEudnAudyk7XG4gICAgY2FtZXJhLnZwLnRwID0gY2xhbXAoY2FtZXJhLnZwLnRwLCAwLCAobWFwaCp0aWxlU2l6ZSkgLSBjYW1lcmEudnAuaCk7XG4gIH1cbn1cbmZ1bmN0aW9uIGRyYXcoY3R4KXtcblxuICBjdHguY2xlYXJSZWN0KDAsMCx3LGggLSA0KTtcblxuICBpZiAod2xkdC5oYXNTa3kpIHtcbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC5maWxsU3R5bGUgPSB3bGR0LnNreUNvbG9yO1xuICAgIGN0eC5maWxsUmVjdCgwLCAwLCB3LCBoKTtcblxuICAgIC8vIENyZWF0ZSBncmFkaWVudFxuICAgIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCh3LCAwLCB3LCBoKTtcblxuICAgIC8vIEFkZCBjb2xvcnNcbiAgICBncmQuYWRkQ29sb3JTdG9wKDAuMDAwLCAncmdiYSgwLCAwLCAwLCAwLjUwMCknKTtcbiAgICBncmQuYWRkQ29sb3JTdG9wKDEuMDAwLCAncmdiYSgwLCAwLCAwLCAwLjAwMCknKTtcbiAgICBcbiAgICAvLyBGaWxsIHdpdGggZ3JhZGllbnRcbiAgICBjdHguZmlsbFN0eWxlID0gZ3JkO1xuICAgIGN0eC5maWxsUmVjdCgwLCAwLCB3LCBoKTtcbiAgICBjdHgucmVzdG9yZSgpO1xuICB9XG5cbiAgZm9yICggaSA9IDA7IGkgPCBjbG91ZHMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgY2xvdWQgPSBjbG91ZHNbaV07XG5cbiAgICBjbG91ZC5kcmF3KGN0eCk7XG4gIH1cblxuICBjYW1lcmEuYmVnaW4oKTtcblxuICB3Y2FtID0geyB4OiBjYW1lcmEudnAubGYsIHk6IGNhbWVyYS52cC50cCwgdzogY2FtZXJhLnZwLncsIGg6IGNhbWVyYS52cC5oIH07XG4gIHNuYyA9IHtcbiAgICBsZjogc2dmKHdjYW0ueCwgdGlsZVNpemUpL3RpbGVTaXplLFxuICAgIHRwOiBzZ2Yod2NhbS55LCB0aWxlU2l6ZSkvdGlsZVNpemUsXG4gICAgdzogKHNnZihjYW1lcmEudnAudywgdGlsZVNpemUpL3RpbGVTaXplKSxcbiAgICBoOiAoc2dmKGNhbWVyYS52cC5oLCB0aWxlU2l6ZSkvdGlsZVNpemUpXG4gIH07XG5cbiAgd2l0aGluQ2FtTG9vcChzbmMsIGZ1bmN0aW9uKHhwLCB5cCkge1xuICAgIGxldCBiZ1RpbGUgPSBiZ1RpbGVzW3hwXVt5cF07XG4gICAgbGV0IGZnVGlsZSA9IGZnVGlsZXNbeHBdW3lwXTtcbiAgICBsZXQgdGwgPSB0aWxlc1t4cF1beXBdO1xuXG4gICAgaWYgKGJnVGlsZSkge1xuICAgICAgaWYgKCF0aWxlc1t4cF1beXBdIHx8IHRpbGVzW3hwXVt5cF0uaSA9PSBlY3J5c3RhbCkge1xuICAgICAgICBiZ1RpbGUuZHJhdyhjdHgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmZ1RpbGUpIHtcbiAgICAgIGZnVGlsZS5kcmF3KGN0eCk7XG4gICAgfVxuXG4gICAgaWYgKHRsKSB7XG4gICAgICB0bC5kcmF3KGN0eCk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoc3BhY2VzaGlwKSB7XG4gICAgc3BhY2VzaGlwLmRyYXcoY3R4KTtcbiAgfVxuXG4gIGZvcihpPTA7aTxwYXJ0cy5sZW5ndGg7aSsrKSB7XG4gICAgcGFydHNbaV0uZHJhdyhjdHgpO1xuICB9XG5cbiAgZm9yKGk9MDtpPHBsYXllcnMubGVuZ3RoO2krKyl7XG4gICAgcGxheWVyc1tpXS5kcmF3KGN0eCk7XG4gIH1cblxuICBmb3IoaT0wO2k8bW9icy5sZW5ndGg7aSsrKXtcbiAgICBtb2JzW2ldLmRyYXcoY3R4KTtcbiAgfVxuXG4gIGZvciAoaT0wO2k8cHJvanMubGVuZ3RoO2krKyl7XG4gICAgcHJvanNbaV0uZHJhdyhjdHgpO1xuICB9XG5cbiAgY2FtZXJhLmVuZCgpO1xuXG4gIGlmIChwbGF5ZXJzLmxlbmd0aCA+IDApIHtcblxuICAgIGlmIChtb3ZlZFRpY2sgPiAyMDAwKSB7XG4gICAgICBoYXNNb3ZlZEFyb3VuZCA9IHRydWU7XG4gICAgfVxuXG4gICAgZm9yICggaSA9IDA7IGkgPCBwbGF5ZXJzWzBdLm1heGhwOyBpKyspIHtcbiAgICAgIGN0eC5kcmF3SW1hZ2UoaGVhcnRlbXB0eSwgMzIgKyAoaSAqIDMyKSwgMzIsIDMyLCAzMik7XG4gICAgICBpZiAoaSA8IHBsYXllcnNbMF0uaHApIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShoZWFydCwgMzIgKyAoaSAqIDMyKSwgMzIsIDMyLCAzMik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGludiA9IFtcbiAgICAgIHsgaWM6IGVjcnlzdGFsLCB0OiBwbGF5ZXIuZWNyeXN0YWwgKyBcIi85XCIgfSxcbiAgICAgIHsgaWM6IHBsYXNtYWJhbGwsIHQ6IHBsYXllci5hbW1vIH0sXG4gICAgICB7IGljOiBvaXJvbiwgdDogcGxheWVyLmlyb24gfVxuICAgIF07XG5cbiAgICBmb3IgKCBpID0gMDsgaSA8IGludi5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGl0ZW0gPSBpbnZbaV07XG4gICAgICBjdHguZHJhd0ltYWdlKGl0ZW0uaWMsIDMyLCA4MCArIChpICogNDgpLCAzMiwgMzIpO1xuXG4gICAgICBjdHguc2F2ZSgpO1xuICAgICAgY3R4LmZvbnQgPSBcImJvbGQgMjRweCBtb25vc3BhY2VcIjtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNmZmZcIjtcbiAgICAgIGN0eC5maWxsVGV4dChpdGVtLnQsIDcyLCAxMDYgKyAoaSAqIDQ4KSk7XG4gICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cblxuICAgIGxldCBtZXNzYWdlID0gW107XG4gICAgbGV0IHJlc3RhcnRNZXNzYWdlID0gXCJcIjtcbiAgICBsZXQgYmFzZVkgPSAyODA7XG5cbiAgICBpZiAoIWhhc01vdmVkQXJvdW5kICYmICFtYXBQcmV2aWV3TW9kZSAmJiAhcGxheWVyc1swXS5kZWFkICYmICFoYXNMYXVuY2hlZCkge1xuICAgICAgbWVzc2FnZVswXSA9IFwiQ1JZU1RBTCBCTEFTVFwiO1xuICAgICAgbWVzc2FnZVsxXSA9IFwiXCI7XG4gICAgICBtZXNzYWdlWzJdID0gXCJZb3UncmUgc3RyYW5kZWQhXCI7XG4gICAgICBtZXNzYWdlWzNdID0gXCJDb2xsZWN0IG5pbmUgZW5lcmd5IGNyeXN0YWxzIHRvIGdldCBiYWNrLlwiO1xuICAgICAgbWVzc2FnZVs0XSA9IFwiWj1KdW1wOyBYPURhc2gvU2hvb3Q7IExlZnQvUmlnaHQgQXJyb3c9TW92ZSBhbmQgRHJpbGw7IERyaWxsIERvd249RG93biBBcnJvdzsgTGFkZGVycz1VcCBBcnJvd1wiO1xuXG4gICAgICBiYXNlWSA9IDY0O1xuICAgIH1cblxuICAgIGlmIChwbGF5ZXJzWzBdLmRlYWQpIHtcbiAgICAgIG1lc3NhZ2VbMF0gPSBcIllvdSBicm9rZS4gOmNcIjtcbiAgICAgIHJlc3RhcnRNZXNzYWdlPVwiUGxlYXNlIHJlbG9hZCB5b3VyIGJyb3dzZXIgdG8gcmVzdGFydC5cIjtcbiAgICB9XG5cbiAgICBpZiAoaGFzTGF1bmNoZWQgJiYgc3BhY2VzaGlwLnkgPCAwKSB7XG4gICAgICBtZXNzYWdlWzBdID0gXCJZb3UncmUgb24geW91ciB3YXkgdG8gb3JiaXQhXCI7XG4gICAgICByZXN0YXJ0TWVzc2FnZT1cIlJlbG9hZCB0byBydW4gb3V0IG9mIGZ1ZWwgYW5kIGNyYXNoIGFnYWluLlwiO1xuICAgIH1cblxuICAgIGlmIChtZXNzYWdlICE9IFwiXCIpIHtcbiAgICAgIGN0eC5zYXZlKCk7XG4gICAgICBjdHguZmlsbFN0eWxlID0gXCIjMTExXCI7XG4gICAgICBjdHguZmlsbFJlY3QoMCwgYmFzZVkgLSAzMiwgdywgMTI4KTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNmZmZcIjtcbiAgICAgIGxldCBmb250U2l6ZSA9ICgzMiAtIChtZXNzYWdlLmxlbmd0aCAqIDQpKTtcbiAgICAgIGN0eC5mb250ID0gZm9udFNpemUgKyBcInB4IG1vbm9zcGFjZVwiO1xuICAgICAgZm9yICggaSA9IDA7IGkgPCBtZXNzYWdlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGN0eC5maWxsVGV4dChtZXNzYWdlW2ldLCAody8yKS1jdHgubWVhc3VyZVRleHQobWVzc2FnZVtpXSkud2lkdGgvMiwgYmFzZVkgKyBmb250U2l6ZSArIChpICogKGZvbnRTaXplICsgNCkpKTtcbiAgICAgIH1cbiAgICAgIGN0eC5mb250ID0gXCIxNHB4IG1vbm9zcGFjZVwiO1xuICAgICAgY3R4LmZpbGxUZXh0KHJlc3RhcnRNZXNzYWdlLCAody8yKS1jdHgubWVhc3VyZVRleHQocmVzdGFydE1lc3NhZ2UpLndpZHRoLzIsIDM0MCk7XG4gICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cbiAgfVxuXG59XG5mdW5jdGlvbiBtbCgpIHtcbiAgdWQoKTtcbiAgZHJhdyhjdHgpO1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUobWwpO1xufVxuYWVsPWFkZEV2ZW50TGlzdGVuZXI7XG5hZWwoJ0RPTUNvbnRlbnRMb2FkZWQnLChlKT0+e1xuICBpbml0KCk7XG4gIG1sKCk7XG59KTtcbmFlbCgna2V5ZG93bicsZT0+e1xuICBjPWUua2V5Q29kZXx8ZS53aGljaDtcbiAga1tjXT0xO1xufSk7XG5hZWwoJ2tleXVwJyxlPT57XG4gIGM9ZS5rZXlDb2RlfHxlLndoaWNoO1xuICBrW2NdPTA7XG59KTtcbiJdfQ==
