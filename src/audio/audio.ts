import { GS } from "../core/state";
import { P } from "../config/params";
import { save } from "../storage/save";
import { danger } from "../world/difficulty";
import { curSkin } from "../render/skins";

// ---------------------------------------------------------------------------
// AUDIO — everything is synthesised with Web Audio, no files. phones only allow
// sound after a user gesture, so the engine starts on the first touch or key.
// ---------------------------------------------------------------------------
export interface SoundOpts {
  to?: number;          // glide target: pitch for tone, filter frequency for noise
  type?: string;        // oscillator type (tone) or filter type (noise)
  vol?: number; a?: number;            // peak volume, attack seconds
  delay?: number; at?: number;         // start offset, or an absolute audio-clock time
  bus?: AudioNode;                     // defaults to the sfx bus
  f?: number; q?: number;              // noise filter frequency and Q
}
// the graph is built on the first user gesture; the nodes are set together with ctx,
// and nothing reads them before ctx exists.
export const AU={
  ctx: null as AudioContext | null,
  sfx: null as unknown as GainNode,
  mus: null as unknown as GainNode,
  musLP: null as unknown as BiquadFilterNode,
  noise: null as unknown as AudioBuffer,
  step: 0, next: 0,
  timer: null as ReturnType<typeof setInterval> | null,
};
export function sfxOn(){ return save.sfx!==0; }
export function musOn(){ return save.music!==0; }
function auInit(){
  if(AU.ctx){ if(AU.ctx.state==="suspended") AU.ctx.resume(); return; }
  var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  try{ AU.ctx=new AC(); }catch(e){ return; }
  var c=AU.ctx, comp=c.createDynamicsCompressor();
  comp.threshold.value=-16; comp.ratio.value=4; comp.connect(c.destination);
  var master=c.createGain(); master.gain.value=0.9; master.connect(comp);
  AU.sfx=c.createGain(); AU.sfx.gain.value=sfxOn()?0.85:0; AU.sfx.connect(master);
  AU.musLP=c.createBiquadFilter(); AU.musLP.type="lowpass"; AU.musLP.frequency.value=1400;
  AU.mus=c.createGain(); AU.mus.gain.value=0; AU.musLP.connect(AU.mus); AU.mus.connect(master);
  var nb=c.createBuffer(1,c.sampleRate,c.sampleRate), d=nb.getChannelData(0);
  for(var i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  AU.noise=nb;
  AU.next=c.currentTime+0.1;
  AU.timer=setInterval(musicTick,25);
}
// a pitched blip: f → o.to over dur, with a fast attack and an exponential tail
function tone(f: number, dur: number, o?: SoundOpts){
  o=o||{}; var c=AU.ctx; if(!c) return; var bus=o.bus||AU.sfx;
  if(bus===AU.sfx && !sfxOn()) return;
  var t=(o.at||c.currentTime)+(o.delay||0), osc=c.createOscillator(), g=c.createGain();
  osc.type=(o.type||"sine") as OscillatorType; osc.frequency.setValueAtTime(f,t);
  if(o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.to),t+dur);
  var v=o.vol||0.15;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+(o.a||0.005));
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t+dur+0.03);
}
// filtered noise: cracks, whooshes, thuds, hats
function noise(dur: number, o?: SoundOpts){
  o=o||{}; var c=AU.ctx; if(!c) return; var bus=o.bus||AU.sfx;
  if(bus===AU.sfx && !sfxOn()) return;
  var t=(o.at||c.currentTime)+(o.delay||0), s=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain();
  s.buffer=AU.noise; f.type=(o.type||"bandpass") as BiquadFilterType; f.frequency.setValueAtTime(o.f||1000,t); f.Q.value=o.q||1;
  if(o.to) f.frequency.exponentialRampToValueAtTime(Math.max(30,o.to),t+dur);
  var v=o.vol||0.12;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+(o.a||0.004));
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t,Math.random()*0.5); s.stop(t+dur+0.03);
}
// the sound palette. kept short and quiet: these fire many times a minute
const SFX: Record<string, (a?: any, b?: any) => void>={
  jump:   function(){ tone(330,0.09,{to:540,type:"triangle",vol:0.11}); },
  launch: function(){ tone(220,0.24,{to:900,type:"sine",vol:0.17}); tone(440,0.18,{to:1300,type:"triangle",vol:0.06,delay:0.03}); },
  drop:   function(){ tone(430,0.09,{to:250,type:"triangle",vol:0.1}); },
  back:   function(){ tone(380,0.07,{to:620,type:"triangle",vol:0.1}); tone(520,0.12,{to:230,type:"triangle",vol:0.09,delay:0.07}); },
  air:    function(){ noise(0.13,{f:1600,to:3800,q:2,vol:0.1}); tone(720,0.09,{to:1150,vol:0.07}); },
  land:   function(){ tone(150,0.07,{to:85,vol:0.16}); noise(0.03,{type:"lowpass",f:900,vol:0.05}); },
  reject: function(){ tone(150,0.06,{type:"square",vol:0.045}); },
  charge: function(){ tone(520,0.06,{to:760,vol:0.07}); tone(780,0.06,{to:1040,vol:0.05,delay:0.05}); },
  crack:  function(){ noise(0.06,{type:"highpass",f:2600,vol:0.13}); noise(0.05,{type:"highpass",f:3200,vol:0.1,delay:0.05}); },
  creak:  function(){ tone(230,0.16,{to:170,type:"sawtooth",vol:0.04}); },
  crumble:function(){ noise(0.38,{type:"lowpass",f:1400,to:260,vol:0.22}); tone(120,0.3,{to:55,vol:0.12}); },
  // a chime, then soft ticks for the length of the ride that climb or fall with it.
  // (it used to be one long gliding tone, which players heard as an engine.)
  liftGo: function(up: boolean,dur: number){ tone(660,0.07,{vol:0.07}); tone(up?880:520,0.08,{vol:0.06,delay:0.07});
    var n=Math.max(3,Math.round(dur/0.1));
    for(var i=1;i<n;i++) tone((up?700:1000)*Math.pow(up?1.035:0.965,i),0.025,{type:"triangle",vol:0.028,delay:0.1+(dur-0.1)*i/n}); },
  liftDing:function(){ tone(880,0.25,{vol:0.09}); tone(1320,0.3,{vol:0.05,delay:0.05}); },
  spike:  function(){ noise(0.12,{type:"highpass",f:4200,vol:0.11}); tone(1500,0.07,{to:2500,type:"square",vol:0.035}); },
  alarm:  function(){ tone(760,0.09,{type:"square",vol:0.075}); tone(760,0.09,{type:"square",vol:0.075,delay:0.17}); },
  foeHop: function(){ tone(115,0.08,{to:70,type:"square",vol:0.06}); },
  poof:   function(){ noise(0.26,{f:900,to:260,q:1.5,vol:0.14}); tone(600,0.12,{to:1200,vol:0.04}); },
  whistle:function(){ tone(1500,0.42,{to:380,vol:0.05,a:0.03}); },
  thump:  function(){ tone(95,0.16,{to:52,vol:0.22}); noise(0.06,{type:"lowpass",f:600,vol:0.1}); },
  squeak: function(){ tone(900,0.08,{to:1600,vol:0.09}); tone(1300,0.07,{to:900,vol:0.05,delay:0.07}); },
  death:  function(){ tone(420,0.65,{to:70,type:"sawtooth",vol:0.1,a:0.01}); noise(0.32,{type:"lowpass",f:900,to:180,vol:0.1}); },
  best:   function(){ [523,659,784,1047].forEach(function(f,i){ tone(f,0.22,{type:"triangle",vol:0.1,delay:0.09*i}); }); },
  unlock: function(){ [784,988,1175,1568].forEach(function(f,i){ tone(f,0.26,{type:"triangle",vol:0.09,delay:0.07*i}); });
                      noise(0.4,{f:3000,to:8000,q:4,vol:0.04,delay:0.1}); },
  revive: function(){ tone(330,0.5,{to:990,type:"triangle",vol:0.1,a:0.05}); noise(0.45,{f:2000,to:6000,q:3,vol:0.06});
                      [659,880,1319].forEach(function(f,i){ tone(f,0.3,{vol:0.06,delay:0.25+0.07*i}); }); },
  click:  function(){ tone(620,0.035,{type:"triangle",vol:0.05}); }
};
// ---- skin voices: a skin with a voice replaces the movement sounds below, and may colour
// the music (see musicTick). anything a voice doesn't define plays the normal sound.
type Fn = (a?: any, b?: any) => void;
function chordNow(){ return CHORDS[Math.floor((AU.step%64)/16)]; }
// a voice's counters restart with each run: GS.gt does, so a drop in it means a new run
var runAt=-1, stair=0, streak=0;
function sameRun(){ if(GS.gt<runAt){ stair=0; streak=0; } runAt=GS.gt; }

// bell (Rainbow): climbing plays a melody. every step up is the next note of whatever
// chord the music is on, three octaves of it; a step down goes back one.
function stairNote(){ var n=stair%9, ch=chordNow()[1]; return ch[n%3]*Math.pow(2,Math.floor(n/3)); }
function stairStep(by: number){ sameRun(); stair=Math.max(0,stair+by); return stairNote(); }
function bell(f: number, vol: number, delay?: number){ tone(f,0.42,{vol:vol,delay:delay}); tone(f*2,0.2,{vol:vol*0.3,delay:delay}); }

// coin (Gold): each landing dings a semitone higher while you keep climbing; a step down resets it
function ding(){ var f=988*Math.pow(2,Math.min(streak,12)/12); tone(f,0.16,{type:"square",vol:0.03}); tone(f*1.5,0.28,{vol:0.05,delay:0.06}); }

// airy (Ghost): breathy, and every sound comes back once as a faint echo
function echo(fn: (delay: number, vol: number) => void){ fn(0,1); fn(0.17,0.32); }

// chime (Galaxy): high notes from the chord the music is on
function chordTone(oct: number){ var ch=chordNow()[1]; return ch[(Math.random()*3)|0]*oct; }

// glass (Diamond): a few high tinkles, for breaking ice
function tinkle(n: number, delay: number){ for(var i=0;i<n;i++) tone(2400+Math.random()*2200,0.09,{vol:0.03,delay:delay+0.05*i+Math.random()*0.03}); }

const VOICES: Record<string, Record<string, Fn>>={
  // Shades: soft rounded tones, a bass hit on landing; the music gets a lo-fi beat
  lofi: {
    jump:   function(){ tone(300,0.1,{to:480,vol:0.09}); },
    drop:   function(){ tone(420,0.1,{to:250,vol:0.08}); },
    launch: function(){ tone(220,0.24,{to:700,vol:0.12}); },
    land:   function(){ tone(72,0.14,{to:44,vol:0.2}); noise(0.05,{type:"lowpass",f:500,vol:0.08}); },
  },
  // Grape: bubbly bloops
  bloop: {
    jump:   function(){ tone(280,0.11,{to:720,vol:0.1}); },
    drop:   function(){ tone(620,0.1,{to:260,vol:0.08}); },
    launch: function(){ tone(220,0.2,{to:900,vol:0.11}); tone(900,0.06,{to:1300,vol:0.04,delay:0.12}); },
    air:    function(){ [620,820,1040].forEach(function(f,i){ tone(f,0.06,{to:f*1.3,vol:0.06,delay:0.04*i}); }); },
    land:   function(){ tone(240,0.09,{to:520,vol:0.09}); },
  },
  // Ghost: whooshes and breaths with an echo; the music sounds far away (musicTick)
  airy: {
    jump:   function(){ echo(function(d,v){ noise(0.14,{f:900,to:2200,q:5,vol:0.08*v,delay:d}); tone(520,0.12,{to:780,vol:0.025*v,delay:d}); }); },
    drop:   function(){ echo(function(d,v){ noise(0.14,{f:2000,to:900,q:5,vol:0.07*v,delay:d}); }); },
    launch: function(){ echo(function(d,v){ noise(0.3,{f:600,to:3000,q:4,vol:0.09*v,delay:d}); }); },
    air:    function(){ echo(function(d,v){ noise(0.16,{f:2500,to:6000,q:6,vol:0.07*v,delay:d}); }); },
    land:   function(){ echo(function(d,v){ noise(0.08,{type:"lowpass",f:700,vol:0.06*v,delay:d}); }); },
  },
  // Robot: 8-bit square-wave bleeps; the music turns chiptune (musicTick)
  chip: {
    jump:   function(){ tone(440,0.06,{to:880,type:"square",vol:0.045}); },
    launch: function(){ [523,659,784,1047].forEach(function(f,i){ tone(f,0.05,{type:"square",vol:0.04,delay:0.035*i}); }); },
    drop:   function(){ tone(660,0.06,{to:330,type:"square",vol:0.045}); },
    air:    function(){ tone(880,0.04,{type:"square",vol:0.04}); tone(1320,0.05,{type:"square",vol:0.035,delay:0.045}); },
    land:   function(){ tone(110,0.04,{type:"square",vol:0.05}); noise(0.02,{type:"highpass",f:5000,vol:0.04}); },
  },
  // Gold: the normal jumps, but coins on landing that climb in pitch
  coin: {
    jump:   function(){ sameRun(); streak++; SFX.jump(); },
    launch: function(){ sameRun(); streak+=2; SFX.launch(); },
    drop:   function(){ sameRun(); streak=0; SFX.drop(); },
    land:   function(){ sameRun(); ding(); },
  },
  // Galaxy: chimes from the current chord; the music gets a celesta (musicTick)
  chime: {
    jump:   function(){ var f=chordTone(4); tone(f,0.4,{vol:0.045}); tone(f*2,0.2,{type:"triangle",vol:0.012}); },
    drop:   function(){ tone(chordTone(2),0.35,{vol:0.04}); },
    launch: function(){ var f=chordTone(4); tone(f,0.4,{vol:0.045}); tone(f*1.5,0.4,{vol:0.04,delay:0.08}); },
    air:    function(){ var ch=chordNow()[1]; ch.forEach(function(f,i){ tone(f*4,0.3,{vol:0.035,delay:0.05*i}); }); },
    land:   function(){ tone(chordTone(8),0.25,{vol:0.02}); tone(140,0.05,{to:95,vol:0.07}); },
  },
  // Diamond: glassy pings, and fragile tiles crack and shatter like ice
  glass: {
    jump:   function(){ tone(1400,0.08,{to:2000,vol:0.05}); },
    drop:   function(){ tone(1800,0.08,{to:1200,vol:0.045}); },
    launch: function(){ tone(1200,0.18,{to:2800,vol:0.06}); },
    land:   function(){ tone(2637,0.15,{vol:0.045}); tone(3951,0.1,{vol:0.022,delay:0.01}); },
    creak:  function(){ tone(2200,0.12,{to:1800,type:"triangle",vol:0.025}); },
    crack:  function(){ noise(0.05,{type:"highpass",f:6500,vol:0.12}); tone(3200,0.06,{to:2600,vol:0.04}); },
    crumble:function(){ noise(0.35,{type:"highpass",f:5000,to:2500,vol:0.12}); tinkle(5,0.04); },
  },
  // Rainbow: see stairStep
  bell: {
    jump:   function(){ bell(stairStep(1),0.085); },
    launch: function(){ bell(stairStep(1),0.08); bell(stairStep(1),0.08,0.07); },   // a spring spans two steps
    drop:   function(){ bell(stairStep(-1),0.05); },
    air:    function(){ var f=stairNote(); tone(f*2,0.3,{vol:0.05}); tone(f*3,0.25,{vol:0.03,delay:0.05}); noise(0.1,{f:5000,to:8000,q:3,vol:0.03}); },
    land:   function(){ tone(140,0.05,{to:95,vol:0.09}); },
  },
};

export function sfx(name: string, a?: unknown, b?: unknown){
  if(!AU.ctx || !sfxOn()) return;
  var v=curSkin().voice, fn=(v && VOICES[v] && VOICES[v][name]) || SFX[name];
  if(fn) try{ fn(a,b); }catch(e){}
}

// music: a soft Am–F–C–G loop at 96 bpm. the melody gets busier and brighter as the
// danger curve rises, so the calm stretches sound calm.
const CHORDS: [number, number[]][]=[[110,[220,261.63,329.63]],[87.31,[174.61,220,261.63]],
            [130.81,[261.63,329.63,392]],[98,[196,246.94,293.66]]];
function musicTick(){
  var c=AU.ctx; if(!c) return;
  var spb=60/96/4;                                   // one sixteenth note
  var dz = GS.state==="play"||GS.state==="paused" ? danger(Math.max(0,Math.round(GS.pl.y/P.stepY))) : 0.15;
  // the skin's voice colours the music:
  //   lofi (Shades)   a soft kick, snare and hats; a warmer filter
  //   airy (Ghost)    far away: darker and quieter
  //   chip (Robot)    square-wave bass and melody
  //   chime (Galaxy)  a celesta plays the melody
  //   bell (Rainbow)  the melody rings an octave up with a long tail
  var voice=curSkin().voice;
  var dark = voice==="airy" ? 0.45 : voice==="lofi" ? 0.7 : 1;
  AU.musLP.frequency.setTargetAtTime((1200+dz*4200)*dark, c.currentTime, 0.4);
  if(AU.next < c.currentTime-0.05) AU.next=c.currentTime;   // after a stall: skip, don't burst
  while(AU.next < c.currentTime+0.12){
    var s=AU.step%64, bar=Math.floor(s/16), ch=CHORDS[bar], t=AU.next, bus=AU.musLP;
    if(musOn()){
      var chip=voice==="chip";
      if(s%16===0) ch[1].forEach(function(f){ tone(f,spb*16,{type:"triangle",vol:0.022,a:0.4,bus:bus,at:t}); });
      if(s%4===0) tone(ch[0],spb*3.5,{type:chip?"square":"sine",vol:chip?0.03:0.09,a:0.01,bus:bus,at:t});
      if(Math.random() < 0.18+0.55*dz){
        var nf=ch[1][(Math.random()*3)|0]*(Math.random()<0.5?2:4);
        if(chip) tone(nf,spb*1.2,{type:"square",vol:0.014,a:0.002,bus:bus,at:t});
        else if(voice==="bell") tone(nf*2,spb*5,{type:"sine",vol:0.02,a:0.003,bus:bus,at:t});
        else if(voice==="chime"){ tone(nf*2,spb*3,{type:"sine",vol:0.022,a:0.002,bus:bus,at:t}); tone(nf*4,spb*1.5,{type:"triangle",vol:0.006,a:0.002,bus:bus,at:t}); }
        else tone(nf,spb*1.6,{type:"triangle",vol:0.028,a:0.004,bus:bus,at:t});
      }
      if(voice==="lofi"){
        if(s%8===0) tone(70,0.2,{to:40,vol:0.13,a:0.003,bus:bus,at:t});
        if(s%8===4) noise(0.12,{f:1800,q:0.8,vol:0.05,bus:bus,at:t});
        if(s%4===2) noise(0.025,{type:"highpass",f:7000,vol:0.018,bus:bus,at:t+spb*0.12});   // a little swing
      }else if(dz>0.35 && s%2===0) noise(0.03,{type:"highpass",f:7000,vol:0.012+0.02*dz,bus:bus,at:t});
    }
    AU.step++; AU.next+=spb;
  }
  // louder while playing, quieter behind menus, off when muted
  var target = !musOn() ? 0 : GS.state==="play" ? 0.85 : GS.state==="paused" ? 0.3 : 0.55;
  if(voice==="airy") target*=0.7;
  AU.mus.gain.setTargetAtTime(target, c.currentTime, 0.3);
  AU.sfx.gain.setTargetAtTime(sfxOn()?0.85:0, c.currentTime, 0.05);
}
export function initAudio(){
  ["pointerdown","keydown","touchstart"].forEach(function(ev){
    window.addEventListener(ev, auInit, true);
  });
}
