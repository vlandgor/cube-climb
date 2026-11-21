import { GS } from "../core/state";
import { AU } from "../audio/audio";
import { doRevive } from "../game/run";
import { $ } from "../ui/dom";
import { IS_DEV } from "./dev";

// ---------------------------------------------------------------------------
// ADS — a rewarded ad on the Revive button, inside the Android/iOS app only. in a
// browser there is no ad and revive stays free. tapping Revive is the opt-in AdMob
// requires for rewarded ads.
// ---------------------------------------------------------------------------
export const ADS={
  // Cube Climb's "Revive" rewarded unit (AdMob -> Apps -> Cube Climb -> Ad units).
  // the dev channel (Cube Climb Dev) always uses Google's test unit, so you never tap
  // your own live ads.
  rewardedId: IS_DEV ? "ca-app-pub-3940256099942544/5224354917" : "ca-app-pub-8265696902451604/5048484873",
  testing: IS_DEV,
  ready:false, loading:false, showing:false, earned:false, canRequest:false,
  privacyRequired:false, left:0
};
export function adMob(){
  var C=window.Capacitor;
  if(!C || !C.isNativePlatform || !C.isNativePlatform() || !C.Plugins) return null;
  return C.Plugins.AdMob || null;
}
export function adsPreload(){
  var A=adMob();
  if(!A || !ADS.canRequest || ADS.ready || ADS.loading) return;
  ADS.loading=true;
  A.prepareRewardVideoAd({adId:ADS.rewardedId, isTesting:ADS.testing})
    .then(function(){ ADS.ready=true; })
    .catch(function(){ ADS.ready=false; })          // no fill / offline: revive stays free
    .then(function(){ ADS.loading=false; });
}
export function adsInit(){
  var A=adMob(); if(!A) return;
  A.addListener("onRewardedVideoAdReward", function(){ ADS.earned=true; });
  A.addListener("onRewardedVideoAdDismissed", function(){
    setTimeout(adFinished, 250);                     // the reward event can arrive just after
  });
  A.addListener("onRewardedVideoAdFailedToShow", function(){ ADS.earned=true; adFinished(); });
  A.initialize({})
    .then(function(){ return A!.requestConsentInfo(); })
    .then(function(info: ConsentInfo){                // GDPR / regional consent, first launch
      if(info && info.isConsentFormAvailable && info.status==="REQUIRED") return A!.showConsentForm();
      return info;
    })
    .then(function(info: ConsentInfo){
      ADS.canRequest = !info || info.canRequestAds!==false;
      ADS.privacyRequired = !!info && info.privacyOptionsRequirementStatus==="REQUIRED";
      $("rowAdPrivacy").style.display = ADS.privacyRequired ? "" : "none";
      adsPreload();
    })
    .catch(function(){ ADS.canRequest=true; adsPreload(); });
}
// the Revive button: an ad if one is ready, otherwise a free revive
export function onReviveTap(){
  if(!GS.offerOn || ADS.showing) return;
  var A=adMob();
  if(!A || !ADS.ready){ doRevive(); adsPreload(); return; }
  ADS.showing=true; ADS.earned=false; ADS.ready=false;
  ADS.left=Math.max(0, GS.offerUntil-GS.now);             // the revive timer freezes during the ad
  if(AU.ctx) AU.ctx.suspend();
  A.showRewardVideoAd().then(function(){ ADS.earned=true; }).catch(function(){});
}
function adFinished(){
  if(!ADS.showing) return;
  ADS.showing=false;
  if(AU.ctx) AU.ctx.resume();
  if(ADS.earned) doRevive();
  else if(GS.offerOn) GS.offerUntil = GS.now + Math.max(ADS.left, 2);   // closed early: decide again
  adsPreload();                                      // ready for the next run
}
