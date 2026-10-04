# Eruda Mobile Console

[한국어 가이드](README.ko.md)

A SillyTavern extension that adds a toggle for [Eruda](https://github.com/liriliri/eruda), an in-page developer console for mobile browsers.

Open **Extensions → Eruda Mobile Console** and check **Enable debug console**. A gear button appears on the screen (middle right by default; pick another spot under **Button position**); tap it to open Console, Elements, Network and Resources. The setting is remembered, so the console comes back after a reload until you turn it off.

Eruda is loaded from jsDelivr (`cdn.jsdelivr.net/npm/eruda@3`) the first time it is enabled.

## Tips

### Logs are kept while the panel is closed

Once enabled, Eruda records console output, uncaught errors and network requests in the background. Use SillyTavern as usual; when something goes wrong, tap the gear and everything since then is there.

- **Reloading clears the record.** Open the console before you refresh.
- The extension loads first so most startup logs are caught, but a few of SillyTavern's very first lines may be missing.
- Tap **Error** at the top of the Console tab to see only errors.

### Running JavaScript

1. Open the **Console** tab.
2. Tap the input line at the bottom (marked `>`).
3. Type or paste your code and tap **Execute**. The Enter key may insert a new line instead of running.
4. The result appears in the log above. Tap `▶` to expand objects.

Code runs in the SillyTavern page, just like the PC developer tools console. For example:

```js
SillyTavern.getContext().extensionSettings.st_eruda
```

### Typing code on a phone

- Phone keyboards often turn `"` into curly quotes (`“ ”`), which breaks code. Turn off **smart punctuation / smart quotes** in your keyboard settings.
- For longer code, copy it from somewhere else and paste it.
