# Local Web-based Proxy

A CroxyProxy-style web proxy that runs **on your Android phone** (Termux + [Rammerhead](https://github.com/binary-person/rammerhead)) and opens from **any device on the same Wi-Fi**.
Type a link or a search, press **Go**, and the site opens inside the same page through the phone's connection.

Created by Sufyan with Claude.

[English](#english) · [العربية](#العربية)

---

## English

### Features

- One page with a URL / search bar and a **Go** button. Sites open inside the page.
- **Tabs** that survive closing the page or restarting the server.
- Two tab views, switched with the **▦ / ▭** button under the search bar:
  - **Rectangles**: a tab strip, like a desktop browser.
  - **Squares**: cards with a live preview of each page, like Chrome's tab switcher. Tap a card to open it.
- **⟳** reload button, **+** new tab, **▲ / ▼** to hide or show the top bar.
- **Saved sessions**: cookies and logins are kept on the phone for a year, so you stay signed in after the phone sleeps or the server restarts.
- **YouTube player**: YouTube's own player is cut off after about a minute behind a rewriting proxy. So on a YouTube video page, the normal YouTube page stays (description, **suggestions, comments**, everything below) and a built-in player powered by `yt-dlp` is placed **at the top, exactly over YouTube's own player area**. Tap a suggested video and the player switches to it. The player has a **quality menu** (from 144p up to what the video offers, 1080p and more), **speed** (0.5x to 2x) and **fullscreen**, all behind the ⚙ button at its top-right corner, and it **remembers your quality and where you stopped**. Fullscreen fills the screen until you leave it.
- No password and no "create session" step.

### Requirements

- An Android phone with **Termux installed from [F-Droid](https://f-droid.org/packages/com.termux/)** (the Google Play version is outdated and breaks Node.js).
- A few hundred MB of free space and an internet connection for the install.
- Other devices must be on the **same network** as the phone.

### Install

Copy and run in Termux, one block at a time:

```
pkg install -y git
git clone https://github.com/Sufyan1545/Local_Web-based-proxy.git
cd Local_Web-based-proxy
bash setup.sh
```

It takes a few minutes. At the end you should see `OK: custom files applied`.
If a question about replacing configuration files appears, press Enter.

### Run

```
~/start-proxy.sh
```

You should see `listening on http://0.0.0.0:8080` and the address to open. Keep Termux open (it holds a wake lock so Android does not stop it).

Then, from any device on the same Wi-Fi, open:

```
http://PHONE_IP:8080
```

Find `PHONE_IP` in the phone's Wi-Fi settings (usually looks like `192.168.x.x`). On the home screen you should see `Created by Sufyan with Claude`.

### Stop

```
~/stop-proxy.sh
```

or press `Ctrl+C` in the Termux window.

### Update

```
cd ~/Local_Web-based-proxy
bash update.sh
```

This pulls the newest files from GitHub, re-installs Rammerhead's dependencies and re-applies everything. Run `~/start-proxy.sh` afterwards, and open the page in a private window (or clear the site data) the first time to avoid an old cached copy.

If YouTube stops working later, update its tool:

```
pip install -U yt-dlp yt-dlp-ejs
```

### Uninstall

```
cd ~/Local_Web-based-proxy
bash uninstall.sh
```

This removes Rammerhead, the saved sessions and the start/stop commands. Delete the project folder yourself if you want it gone too.

### Optional: start with one tap from the home screen

1. Install **Termux:Widget** from F-Droid (same source as Termux).
2. Long-press the home screen, choose Widgets, and add **Termux:Widget**.
3. Tap **Start-Proxy** or **Stop-Proxy**. (`setup.sh` already creates both.)
4. Android may ask for "Display over other apps" for Termux, and you should set Termux's battery usage to Unrestricted so the system does not stop it.

### Using the page

| Control | What it does |
|---|---|
| Address bar + **Go** / Enter | Opens a link. Text that is not a link is searched on DuckDuckGo. |
| **⟳** | Reloads the current tab. |
| **+** | New empty tab. |
| **▦ / ▭** (under the search bar) | Switches between square cards and the rectangle tab strip. |
| **×** on a tab or card | Closes it. |
| **▲ / ▼** | Hides or shows the bar. |

Notes:

- Tabs are saved **in the browser of the device you use**. Another device has its own tabs, and clearing the site data deletes them (and the saved session id).
- Squares view loads previews for up to 8 tabs. Every loaded tab uses memory, so close the ones you do not need on small devices. YouTube video tabs show a placeholder card instead of a live preview.

### Configuration

Settings live in `src__config.js` (it replaces Rammerhead's `src/config.js`). Edit it, push to GitHub, then run `bash update.sh`. The ones that matter here:

| Setting | Value here | Meaning |
|---|---|---|
| `port` | `8080` | Port to open in the browser. |
| `password` | `null` | No password. The included page does **not** support password-protected servers, so leave it `null`. |
| `restrictSessionToIP` | `false` | Allows a saved session to be used even if the device address changes. |
| `staleTimeout` | 1 year | How long unused sessions (and logins) are kept. |
| `workers` | `2` | Fixed worker count (Termux can report zero CPUs). |
| `disableHttp2` | `false` | Keep it `false`: picky sites such as WhatsApp Web need HTTP/2, and turning it off makes them load forever. |
| `disableLocalStorageSync` | `false` | Keep it `false`: it saves each site's local storage in the session. Turning it off can break heavy sites such as YouTube. |

To pin the upstream Rammerhead version, put a commit hash in `RH_COMMIT` at the top of `setup.sh`.

### Troubleshooting

| Problem | Fix |
|---|---|
| `CANNOT LINK EXECUTABLE "node"` / `libicu` error | `pkg upgrade -y && pkg reinstall libicu nodejs-lts`. Use Termux from F-Droid. |
| `FAIL: ...` at the end of `setup.sh` | The GitHub files are old or missing. Make sure all files of this repo are uploaded, then `bash update.sh`. |
| You see Rammerhead's original page, not this one | Run `bash update.sh`, restart with `~/start-proxy.sh`, open the page in a private window. The home screen should show `v7`. |
| `Cannot read properties of undefined (reading 'process')` | The worker count. This repo's config already sets `workers: 2`, so update. |
| `Sessions must come from the same IP` | Already disabled by this config. Update and open the page in a private window to create a new session. |
| Page cannot be opened from another device | Check both devices are on the same Wi-Fi, use the phone's current IP, and make sure the proxy is running. Some routers block device-to-device traffic ("AP isolation"). |
| Google rejects sign-in ("browser not secure") | Expected: Google blocks sign-in through any rewriting proxy. Browse without signing in, or use another method. |
| On a YouTube page the player box is black or in the wrong place | Open the page in a private window and wait a second. The player is laid over YouTube's own player area, found by looking inside the page. If YouTube changes its page the position falls back to a 16:9 block at the top. |
| YouTube video stutters, or sound and picture drift apart | 360p is a single file and the most reliable. Higher qualities load picture and sound separately and keep them in sync in the page, which a slow phone or network can struggle with. Pick a lower quality in the player's quality menu. |
| No volume slider in the player on higher qualities | The picture stream has no sound track, so the browser hides the slider. Use the device's volume buttons. |
| YouTube shows an error or does not play | The built-in player needs `yt-dlp`. Run `pip install -U yt-dlp yt-dlp-ejs` and start again. The player shows the error text in red, which tells you what failed. |
| WhatsApp Web or game sites load forever, or YouTube shows a blank page | Check `src/config.js`: `disableHttp2` and `disableLocalStorageSync` must both be `false`. Run `bash update.sh` to restore them. |
| Port already in use | Run `~/stop-proxy.sh`, then start again. |
| Tabs disappeared | The browser's site data was cleared. Tabs are stored there. |

### Security and responsible use

- There is **no password**. Anyone on your network can open the page and browse through your phone. Use it on a network you trust.
- **Never** forward port 8080 on your router and never expose it to the internet (no ngrok-style tunnels).
- Do not enter passwords for sensitive accounts (bank, main email) through any web proxy.
- Use it only where your network, school, workplace or device rules allow it. Do not use it to bypass restrictions you are bound by (for example filters or exam rules).

### How it works

`setup.sh` downloads the original Rammerhead, then replaces original files with the files in this repo. A file named `folder__file.ext` replaces `folder/file.ext`:

| Repo file | Replaces / becomes |
|---|---|
| `public__index.html` | `rammerhead/public/index.html`: the page (bar, tabs, views) |
| `src__config.js` | `rammerhead/src/config.js`: settings |
| `yt__server.js` | `rammerhead/yt/server.js`: the YouTube player helper (port 8090) |
| `setup.sh` | Installer and updater (also creates `~/start-proxy.sh` and `~/stop-proxy.sh`) |
| `update.sh` | `git pull` + `setup.sh` |
| `uninstall.sh` | Removes everything installed outside this folder |

To customize another Rammerhead file, add a file with the same naming rule and run `bash update.sh`.

### Credits

- [Rammerhead](https://github.com/binary-person/rammerhead) by binary-person (downloaded at install time, under its own license; this repo contains only the overlay files).
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for the YouTube player.
- Created by Sufyan with Claude.

---

## العربية

بروكسي ويب يشبه CroxyProxy يعمل **على هاتف أندرويد** (Termux + Rammerhead) ويُفتح من **أي جهاز على نفس شبكة الواي فاي**. تكتب رابطاً أو كلمة بحث وتضغط **Go** فيفتح الموقع داخل نفس الصفحة عبر اتصال الهاتف.

### المميزات

- صفحة فيها شريط رابط/بحث وزر Go، والمواقع تفتح داخلها.
- **تبويبات** تبقى بعد إغلاق الصفحة أو إعادة تشغيل الخادم.
- عرضان للتبويبات بزر **▦ / ▭** أسفل البحث: **مستطيلات** (شريط تبويبات) أو **مربعات** (بطاقات فيها معاينة حية لكل صفحة مثل Chrome، واضغط البطاقة لفتحها).
- زر إعادة التحميل ⟳، وزر + لتبويب جديد، وزر ▲ / ▼ لإخفاء الشريط.
- **جلسات محفوظة**: الكوكيز وتسجيلات الدخول تبقى على الهاتف سنة.
- **مشغّل يوتيوب مدمج** (بأداة yt-dlp) لأن مشغّل يوتيوب الأصلي ينقطع بعد دقيقة خلف أي بروكسي من هذا النوع. تبقى صفحة يوتيوب العادية (الوصف و**الاقتراحات والتعليقات** وكل ما تحت الفيديو)، ويوضع المشغّل المدمج **في الأعلى فوق مكان مشغّل يوتيوب مباشرة**. اضغط على فيديو مقترح فيتبدّل المشغّل إليه. وفي المشغّل **قائمة جودة** (من 144p حتى أعلى ما يوفره الفيديو، مثل 1080p) و**سرعة** التشغيل (0.5x إلى 2x) و**ملء الشاشة**، كلها خلف زر ⚙ في زاويته العليا، ويتذكر الجودة التي اخترتها ومكان توقفك.
- بدون كلمة سر وبدون خطوة "إنشاء جلسة".

### المتطلبات

- هاتف أندرويد وتطبيق **Termux من F-Droid** (نسخة Google Play قديمة وتسبب أخطاء Node.js).
- مساحة فارغة واتصال إنترنت وقت التثبيت.
- الأجهزة الأخرى على **نفس الشبكة** التي عليها الهاتف.

### التثبيت

انسخ ونفّذ في Termux كل كتلة على حدة:

```
pkg install -y git
git clone https://github.com/Sufyan1545/Local_Web-based-proxy.git
cd Local_Web-based-proxy
bash setup.sh
```

يستغرق بضع دقائق، وفي آخره يجب أن ترى `OK: custom files applied`. وإن ظهر سؤال عن استبدال ملفات إعدادات اضغط Enter.

### التشغيل

```
~/start-proxy.sh
```

اترك Termux مفتوحاً. ثم من أي جهاز على نفس الشبكة افتح `http://IP_الهاتف:8080` (تجد IP الهاتف في إعدادات الواي فاي).

### الإيقاف

```
~/stop-proxy.sh
```

أو اضغط `Ctrl+C` في نافذة Termux.

### التحديث

```
cd ~/Local_Web-based-proxy
bash update.sh
```

ثم شغّل `~/start-proxy.sh` وافتح الصفحة في نافذة خاصة أول مرة. ولو توقف يوتيوب مستقبلاً حدّث أداته: `pip install -U yt-dlp yt-dlp-ejs`.

### الإزالة

```
cd ~/Local_Web-based-proxy
bash uninstall.sh
```

### تشغيل بضغطة واحدة من الشاشة الرئيسية (اختياري)

ثبّت **Termux:Widget** من F-Droid وأضفه كـ Widget على الشاشة الرئيسية، ثم اضغط **Start-Proxy** أو **Stop-Proxy** (ينشئهما `setup.sh` تلقائياً). قد يطلب أندرويد إذن "العرض فوق التطبيقات"، واجعل بطارية Termux على "غير مقيّد".

### ملاحظات مهمة

- التبويبات محفوظة في **متصفح الجهاز الذي تستخدمه**، فلكل جهاز تبويباته، ومسح بيانات الموقع في المتصفح يحذفها.
- عرض المربعات يحمّل معاينات لحد 8 تبويبات، وكل تبويب محمّل يستهلك ذاكرة. وتبويبات فيديو يوتيوب تظهر كبطاقة بدون معاينة حية.
- جوجل ترفض تسجيل الدخول عبر أي بروكسي يعيد كتابة الصفحات (تظهر رسالة "المتصفح غير آمن") وهذا متوقع.
- **لا توجد كلمة سر**: أي شخص على شبكتك يستطيع استخدام البروكسي، فلا تفتح المنفذ 8080 من الراوتر ولا تعرّضه للإنترنت، ولا تدخل بيانات حسابات حساسة عبره.
- استخدمه فقط حيث تسمح لك قواعد الشبكة أو المدرسة أو العمل أو الجهاز، ولا تستخدمه لتجاوز قيود ملزم بها (مثل الفلاتر أو قواعد الامتحانات).

### حل المشاكل الشائعة

- **خطأ `CANNOT LINK EXECUTABLE "node"`:** نفّذ `pkg upgrade -y && pkg reinstall libicu nodejs-lts` واستخدم Termux من F-Droid.
- **ظهرت كلمة `FAIL` في آخر `setup.sh`:** ملفات GitHub قديمة أو ناقصة. تأكد من رفع كل ملفات المشروع ثم `bash update.sh`.
- **ظهرت صفحة Rammerhead الأصلية:** نفّذ `bash update.sh` وأعد التشغيل وافتح الصفحة في نافذة خاصة، وفي الصفحة الرئيسية يجب أن ترى `v7`.
- **الصفحة لا تفتح من جهاز آخر:** تأكد أن الجهازين على نفس الواي فاي، وأن الـ IP هو الحالي للهاتف، وأن البروكسي يعمل. بعض الراوترات تمنع التواصل بين الأجهزة (AP isolation).
- **مربع المشغّل أسود أو في مكان غير صحيح في صفحة يوتيوب:** افتح الصفحة في نافذة خاصة وانتظر ثانية. المشغّل يوضع فوق مكان مشغّل يوتيوب الذي يُكتشف من داخل الصفحة، ولو غيّر يوتيوب صفحته يعود لمكان احتياطي (مربع 16:9 في الأعلى).
- **فيديو يوتيوب يتقطع أو الصوت متأخر عن الصورة:** جودة 360p ملف واحد وأكثر ثباتاً. الجودات الأعلى تحمّل الصورة والصوت منفصلين وتزامنهما الصفحة، وقد يصعب ذلك على هاتف أو شبكة بطيئة، فاختر جودة أقل من قائمة الجودة.
- **لا يظهر شريط الصوت في المشغّل مع الجودات العالية:** تيار الصورة بلا صوت فيخفي المتصفح الشريط، فاستخدم أزرار صوت الجهاز.
- **يوتيوب لا يشتغل:** نفّذ `pip install -U yt-dlp yt-dlp-ejs` وشغّل من جديد. ويعرض المشغّل نص الخطأ بالأحمر ليوضح السبب.
- **واتساب ويب أو مواقع الألعاب تحمّل بلا نهاية، أو يوتيوب صفحة بيضاء:** تأكد في `src/config.js` أن `disableHttp2` و`disableLocalStorageSync` كلاهما `false`، أو نفّذ `bash update.sh` لإرجاعهما.
- **المنفذ مستخدم:** نفّذ `~/stop-proxy.sh` ثم شغّل من جديد.
- **اختفت التبويبات:** غالباً تم مسح بيانات الموقع في المتصفح.

### الملفات

| الملف | وظيفته |
|---|---|
| `public__index.html` | يحل محل `public/index.html`: الصفحة (الشريط والتبويبات والعروض) |
| `src__config.js` | يحل محل `src/config.js`: الإعدادات |
| `yt__server.js` | يصبح `yt/server.js`: مساعد مشغّل يوتيوب (المنفذ 8090) |
| `setup.sh` | التثبيت والتحديث (وينشئ `~/start-proxy.sh` و`~/stop-proxy.sh`) |
| `update.sh` | `git pull` ثم `setup.sh` |
| `uninstall.sh` | إزالة ما تم تثبيته خارج هذا المجلد |

القاعدة: أي ملف اسمه `folder__file.ext` يحل محل `folder/file.ext` داخل Rammerhead الأصلي الذي يُنزَّل وقت التثبيت.

---

Created by Sufyan with Claude.