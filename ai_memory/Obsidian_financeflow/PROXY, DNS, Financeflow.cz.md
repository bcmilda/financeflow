![[Pasted image 20260712221414.png]]
![[Pasted image 20260712221455.png]]
### 1) Co se stane vypnutím mráčku u A 199.36.158.100

Ten záznam už správně míří na Firebase, ale s oranžovým mráčkem ho Cloudflare **schovával za sebe** – proto Firebase v DNS viděl jen Cloudflare IP a doménu nemohl ověřit.

Vypnutím (šedý mráček = DNS only):

- Provoz půjde **přímo na Firebase**, ne přes Cloudflare
- Firebase doménu ověří → „Needs setup" zmizí → vystaví si vlastní SSL certifikát
- **Action URL začne fungovat** (Firebase Auth potřebuje ověřenou doménu)
- E-maily (Resend, ImprovMX) i Worker jedou dál – ty A záznamy s nimi nesouvisí

Během ověřování a vystavování certifikátu (většinou desítky minut, výjimečně až 24 h) může být web chvíli nedostupný nebo hlásit chybu certifikátu. To je normální a přejde to.

Ty čtyři Cloudflare A/AAAA záznamy (104.21.x, 172.67.x, 2606:4700:x) můžeš smazat – jsou tam automaticky kvůli proxy a Firebase je chce pryč.

### 2) Co ztratíš – a jestli to vadí

**CDN** = síť serverů po světě, které cachují statické soubory (JS, CSS, obrázky) blíž k uživateli, takže se web načte rychleji. **Firebase Hosting má vlastní globální CDN.** Takže o CDN nepřijdeš – jen ji bude dělat Firebase místo Cloudflare. Pro české uživatele je to prakticky stejné.

**SSL/HTTPS** – Firebase automaticky vystaví a obnovuje certifikát. Bez starostí.

**DDoS ochrana** – Cloudflare má silnější a konfigurovatelnější ochranu. Firebase (Google) má taky ochranu na infrastrukturní úrovni, protože běží na Google Cloud. Pro appku tvé velikosti (jednotky až desítky uživatelů) je riziko cíleného DDoS prakticky nulové – to je hrozba pro velké nebo kontroverzní weby.

**WAF** (Web Application Firewall) = filtruje škodlivé requesty (SQL injection, XSS pokusy). Pro tebe má omezený význam: appka je statická (HTML/JS), nemá vlastní backend server s databází, kam by šlo něco injektovat. Data chrání **Firebase Security Rules** (database_rules.json) – to je tvoje reálná ochranná vrstva a ta funguje bez ohledu na Cloudflare.

**Kde je tvůj skutečný bezpečnostní perimetr:**

- Firebase Auth (kdo se přihlásí)
- database_rules.json (kdo vidí jaká data)
- Worker s rate limitingem (kdo může volat API a kolikrát)

To všechno běží nezávisle na Cloudflare proxy.

### Doporučení

Vypni mráček. Získáš funkční Action URL (což teď reálně nefunguje) a ztratíš ochranu, kterou v tvé situaci prakticky nepotřebuješ. Je to plně vratné – kdybys chtěl, mráček kdykoli zapneš zpátky.

**Kdybys Cloudflare ochranu chtěl zachovat:** existuje varianta nechat proxy zapnutou a ověřit doménu přes TXT záznam místo A záznamu, ale Firebase Hosting to oficiálně nepodporuje a hosting přes Cloudflare proxy k Firebase bývá zdrojem problémů (přesně jako teď). Nedoporučuju do toho jít – vypnutí mráčku je čistší.

### Co ztratíš

Vypnutím Cloudflare proxy přijdeš o Cloudflare CDN cache, DDoS ochranu a WAF pro tu doménu. Pro tvůj případ (Firebase Hosting má vlastní CDN a SSL) to není kritické. Cloudflare zůstane jako DNS provider, jen přestane doménu proxovat.