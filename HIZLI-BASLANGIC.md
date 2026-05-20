# Atelier — Hızlı Başlangıç

Şahsî yazı atölyeniz. Yalnız size özel.

## 1. Node.js Kurulumu (yoksa)

[https://nodejs.org/](https://nodejs.org/) → **LTS** sürümünü indir ve kur.
Versiyon: Node 20 veya 22 önerilir.

Doğrulama:
```
node --version
npm --version
```

## 2. Paketten Çıkar

İndirdiğin `Atelier.zip` dosyasını istediğin bir klasöre çıkar.
Örn: `C:\Users\Sen\Atelier\` (Windows) ya da `~/Atelier/` (Mac/Linux).

## 3. Bağımlılıkları Kur

Çıkardığın klasörün içinde terminal/PowerShell aç ve:
```
npm install
```

İlk seferde 3-5 dakika sürebilir, `better-sqlite3` ve `nspell` gibi native modüllerin Electron için yeniden derlenmesi de bu adımda olur.

> **Windows için:** Eğer native modül derlemesi hata verirse, [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ build tools) gerekebilir. Komut satırından:
> ```
> npm install --global windows-build-tools
> ```

## 4. Geliştirme Modu (test için)

```
npm run dev
```

Atelier penceresi açılacak. Klavyeyle yaz, yazım denetimini gör, sözlüğe sağ tıkla, AI panelini aç vs.

## 5. Kalıcı Kurulum (.exe oluştur)

Windows için tıkla-çalıştır kurulum dosyası:
```
npm run dist:win
```

Tamamlandığında `release/` klasöründe `Atelier Setup 1.0.0.exe` dosyası oluşur. Bunu çalıştırarak Atelier'i Windows'a normal program gibi kurarsın (Başlat menüsü, masaüstü kısayolu, kaldırıcı vs. otomatik).

Mac için: `npm run dist` (.dmg)
Linux için: `npm run dist` (AppImage)

## 6. İlk Çalıştırma Sonrası

Atelier açıldığında:

1. **Sol Sidebar** → "Ayarlar" sekmesine git
2. **Yapay Zekâ** → Claude API anahtarını gir (https://console.anthropic.com)
3. **Bulut Eşitleme** → WebDAV URL'ini gir (Nextcloud/ownCloud kullanıyorsan)
4. **Beslemeler** sekmesinden RSS kaynaklarını ekle

## Görsel Esinleri

- **Pineider Capri** → ana renk paleti (lacivert, bordo, altın)
- **G. Lalo Vélin** → kâğıt yüzeyi (pürüzsüz, dokulu)
- **G. Lalo Toile ancienne** → alternatif kâğıt (kumaş dokusu)
- **Original Crown Mill** → harf belirme animasyonu, mürekkep hissi
- **Pineider pamuklu bloknotlar** → defter görünümü
- **Moleskine Hemingway dönemi** → ajanda ve günce tasarımı

Sidebar altında "Pineider Capri · Vélin" yazıyor. Kâğıt tarzını alt durum çubuğundan değiştirebilirsin.

## Kısayollar

- `Ctrl + S` → Kaydet
- `Ctrl + B / I / U` → Kalın / İtalik / Altı çizili
- `Ctrl + 1/2/3` → Başlık 1/2/3
- Sağ tık (yanlış kelime üstünde) → Yazım önerileri

## Veri Konumu

Tüm verilerin (belgeler, defter, ajanda, zettelkasten, RSS) şurada yerel SQLite'de tutulur:

- Windows: `%APPDATA%\Atelier\data\atelier.db`
- Mac: `~/Library/Application Support/Atelier/data/atelier.db`
- Linux: `~/.config/Atelier/data/atelier.db`

Yedek için: Ayarlar → Bulut Eşitleme → "Yerel Yedek Oluştur" (JSON olarak Downloads'a kaydeder).

## Destek

Bu kişisel bir uygulamadır. Hata mı çıktı? Konsola bak (Geliştirme modunda DevTools açık gelir).

— *Atelier; bir his var, kelimelere döker.*
