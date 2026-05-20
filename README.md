# Atelier

> *Kişisel bir yazı atölyesi — yalnızca size özel.*

Atelier, klasik kırtasiye estetiğini ve modern bir yazı ortamını bir araya getiren, masaüstü için **kişisel lüks yazı atölyesidir**. Pineider Capri ciltleri, G. Lalo Vélin ve Toile ancienne kâğıtları, Original Crown Mill mürekkep duygusu ve Moleskine Hemingway not defterlerinin sıcaklığından ilham alır.

Tek kullanıcı içindir. Bulutta tutulmaz, paylaşılmaz; tüm veriler sizin makinenizde yaşar.

---

## Özellikler

- **Atölye Editörü** — Tiptap tabanlı, kâğıt dokulu, altın imleçli editör. Vélin / Toile ancienne / Cotton kâğıt stilleri.
- **Defterler & Belgeler** — SQLite ile yerel saklama; etiketleme, arama, dil desteği.
- **Ajanda** — Moleskine takvim görünümü ile randevu ve günlük girişleri.
- **Zettelkasten** — Bağlantılı not sistemi, geriye dönük bağlantılar, görsel ağ.
- **RSS Okuyucu** — Beslemeler, kaydedilen yazılar, okuma durumu.
- **Yapay Zekâ Asistanı** — Anthropic (Claude) veya OpenAI; metni geliştir, devam et, çevir, özetle.
- **Yazım Denetimi** — TR / EN / FR / IT için Hunspell sözlükleri ile yerel denetim.
- **Bulut Eşitleme** — Nextcloud / ownCloud (WebDAV) üzerinden yedek ve geri yükleme.
- **Dışa Aktarma** — PDF, DOCX, Markdown.
- **Lüks Tipografi** — Cormorant Garamond, EB Garamond, Crimson Pro.

---

## Kurulum

Gereksinimler: **Node.js 20+**, **npm**.

```bash
npm install
```

Yerel bağımlılıklar (örn. `better-sqlite3`) `postinstall` adımında Electron için otomatik olarak yeniden derlenir.

---

## Geliştirme

```bash
npm run dev
```

Electron geliştirme modunda, sıcak yenileme ve DevTools ile başlar.

---

## Üretim Derlemesi

Windows için tek tıkla kurulum (NSIS, masaüstü + başlat menüsü kısayolları):

```bash
npm run dist:win
```

macOS (DMG) ve Linux (AppImage) için:

```bash
npm run dist
```

Çıktı `release/` klasörüne yazılır.

İkonlar için `resources/icon.ico`, `resources/icon.icns`, `resources/icon.png` dosyalarını eklemeniz gerekir. (Bkz. `resources/README.md`.)

---

## Görsel Esinler

| Esin | Kullanımı |
| --- | --- |
| **Pineider Capri** | Bordo deri, altın damgalar, lacivert mürekkep |
| **G. Lalo Vélin / Toile ancienne** | Kâğıt dokuları, krem tonları |
| **Original Crown Mill** | Mürekkebin sayfaya yerleşme hissi, imleç parıltısı |
| **Moleskine Hemingway** | Takvim ızgarası, hafif noter dokusu |

Renkler: paper-cream, paper-warm, paper-toile, ink-primary, leather-dark/medium, pineider-bordeaux/gold/navy, crown-blue.

---

## Teknoloji

- **Electron** + **Vite** (`electron-vite`)
- **React 19** + **TypeScript**
- **TailwindCSS 3** (özel renkler, kâğıt dokuları)
- **Tiptap 2** — zengin metin editörü
- **better-sqlite3** — yerel veritabanı
- **nspell** + `dictionary-{tr,en,fr,it}` — Hunspell yazım denetimi
- **webdav** — Nextcloud / ownCloud eşitleme
- **rss-parser** — RSS / Atom besleme okuyucu
- **@anthropic-ai/sdk** ve **openai** — AI sağlayıcılar
- **pdfmake** + **docx** — dışa aktarım
- **vis-network** — Zettelkasten görselleştirme
- **Zustand** — durum yönetimi

---

## Kişisel Kullanım

Atelier, üretilirken yayıma açılması düşünülmedi. Hiçbir telemetri, hiçbir hesap, hiçbir senkronizasyon zorunluluğu içermez. Tüm veriler `app.getPath('userData')` altında saklanır; istenirse bir WebDAV sunucusuna manuel olarak yedeklenir.

API anahtarlarınız yalnızca yerel SQLite veritabanında tutulur; ağ üzerinden başka bir yere gönderilmez.

---

*“Yazmak, dünyayı kâğıda taşıma sanatıdır.”*
