# 🚀 SYNCHRO // Next-Gen Watch Party & Canlı Yayın & IPTV Hub

Watch2Gether benzeri, ancak canlı maçlar, IPTV, film siteleri, YouTube ve sıfır gecikmeli ekran/sesli sohbet özellikleriyle donatılmış yeni nesil platform.

---

## ⚡ Temel Özellikler

### 1. 📺 Canlı Maç, IPTV & Xtream Codes Desteği
- **Otomatik Xtream & M3U Çözücü:**
  `http://fixtv123.xyz:2095/get.php?username=...&password=...&type=m3u` gibi IPTV bağlantılarını otomatik tanır.
- **7.000+ Kanal & Akıllı Kategorilendirme:**
  - beIN SPORTS LIVE (1, 2, 3, 4, Haber, vb.)
  - EXXEN SPORTS (1, 2, 3, 4, vb.)
  - S SPORT & S SPORT 2
  - TABII SPOR & TRT SPOR
  - Smart Spor, Eurosport ve Dünya Kanalları
- **Dahili CORS & Akış Proxy:**
  Tarayıcıların engellediği, CORS korumalı veya karma içerik (HTTP/HTTPS) içeren IPTV ve canlı maç yayınlarını sunucu üzerinden kesintisiz çözer.
- **LL-HLS (Low Latency HLS):** Canlı yayınlarda milisaniye gecikmeli akıcı senkronizasyon.

### 2. 🍿 Film Siteleri & Her Türlü Video Desteği
- **YouTube Senkronizasyonu:** Oynat, durdur ve ileri/geri sarma tüm odada anlık eşitlenir.
- **Doğrudan MP4 / WebM / MKV:** Herhangi bir video URL'sini doğrudan oynatır.
- **Ultra Düşük Gecikmeli Ekran Paylaşımı (WebRTC):** Film siteleri iframe veya telif korumalıysa, yan sekmede filmi açıp "Ekran Paylaşımı" ile odaya 60 FPS sıfır gecikmeyle aktarabilirsiniz.

### 3. 🎙️ Gerçek Zamanlı Sesli Sohbet (Voice Chat)
- Tarayıcı içi doğrudan **WebRTC P2P** ses ağı.
- Konuşan kişiyi anlık tespit eden yeşil dinamik halka (Ses Dalgalanması).
- Mikrofonu kapatma (Mute), sağırlaştırma (Deafen).
- Odadaki her arkadaşınız için bağımsız **Ses Seviyesi Kaydırıcısı (Volume Slider)**.

### 4. 💬 Canlı Sohbet & Uçuşan Reaksiyonlar (Reactions)
- Canlı oda sohbeti, sistem bildirimleri (katıldı/ayrıldı/yayın değiştirdi).
- Video ekranı üzerinde süzülen eğlenceli reaksiyonlar (🔥, ⚽, 🍿, 🚀, ❤️, 😂).
- Web Audio API ile sıfır harici dosya bağımlılığıyla çalışan arayüz ses efektleri.

### 5. 🎨 Menü & Profil Özelleştirmesi
- Kullanıcı adı, avatar emojisi (🎮, ⚡, 🔥, 🚀, vb.) ve isim rozet rengi seçimi.
- **Yönetici Kontrol Modu:** Yalnızca oda sahibinin oynat/durdur yapabilmesi seçeneği.
- **Sinema Modu (Theater Mode):** Sohbeti gizleyip devasa ekran izleme modu.
- **Davet Sistemi:** Tek tıkla kopyalanabilir oda davet linki ve oda kodu.

---

## 🛠️ Çalıştırma Talimatları

Projeyi başlatmak için terminalde:

```bash
# Hem sunucu (port 3001) hem istemciyi (port 5173) aynı anda başlatır:
npm run dev
```

- **Frontend Arayüzü:** [http://localhost:5173](http://localhost:5173)
- **Backend Sunucusu:** [http://localhost:3001](http://localhost:3001)

---

## ⚽ IPTV Bağlantınızı Kullanma

1. Tarayıcınızda [http://localhost:5173](http://localhost:5173) adresine gidin.
2. Üst menüdeki veya oynatıcı altındaki **"IPTV & Canlı Maçlar"** butonuna tıklayın.
3. Bağlantınız (`http://fixtv123.xyz:2095/get.php?username=necati29&password=20082010hasanmete&type=m3u`) otomatik olarak yüklü gelecektir.
4. İster kategori butonlarından (`beIN SPORTS`, `EXXEN`, `S SPORT` vb.) filtreleyin, ister arama kutusuna kanal adı yazın.
5. İstediğiniz kanalın yanındaki **"Odaya Aç"** butonuna basarak tüm odaya anında canlı yayını başlatın!
