// The slice of the Capacitor bridge the game uses. Inside the Android/iOS app the native
// shell injects window.Capacitor; in a browser it is absent and every caller checks for it.

interface ConsentInfo {
  status?: string;                          // "REQUIRED", "OBTAINED", ...
  isConsentFormAvailable?: boolean;
  canRequestAds?: boolean;
  privacyOptionsRequirementStatus?: string;
}

interface AdMobBridge {
  initialize(opts: object): Promise<void>;
  requestConsentInfo(): Promise<ConsentInfo>;
  showConsentForm(): Promise<ConsentInfo>;
  showPrivacyOptionsForm(): Promise<void>;
  prepareRewardVideoAd(opts: { adId: string; isTesting: boolean }): Promise<unknown>;
  showRewardVideoAd(): Promise<unknown>;
  addListener(event: string, fn: (...args: unknown[]) => void): unknown;
}

interface AppBridge {
  addListener(event: "backButton" | "pause" | "resume", fn: () => void): unknown;
  exitApp(): Promise<void>;
}

interface Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: { AdMob?: AdMobBridge; App?: AppBridge };
  };
  webkitAudioContext?: typeof AudioContext;
}
