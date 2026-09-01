import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Reverse-DNS bundle identifier. Cheap to change now; painful once signing
  // certificates and installed copies on phones are tied to it.
  appId: "uk.antondegroot.filament",
  appName: "Filament Manager",

  // Where `npm run build` leaves the app. Unlike PhotoKeeper there is no
  // `server.url` here: the whole app is one HTML file with no backend, so the
  // bundle inside the APK is what actually renders and the phone needs nothing
  // to be reachable.
  webDir: "dist",

  android: {
    // The app's own --paper background. Without it the webview paints white for
    // the moment before the first frame, which reads as a flash on launch.
    backgroundColor: "#DEDCD6",
  },

  plugins: {
    // Both system bars sit against the app's dark --machine chrome, so their
    // icons have to be the light set. Left on DEFAULT the plugin picks from the
    // phone's day/night setting, which on a phone in light mode draws a dark
    // gesture pill on a dark bar.
    SystemBars: {
      style: "DARK",
    },
  },
};

export default config;