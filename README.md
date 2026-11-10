# Sudoku

Werbefreies Sudoku als Web-App (PWA) – läuft im Browser, lässt sich auf Android wie eine App installieren und funktioniert danach auch offline. Keine Werbung, kein Tracking, keine Anmeldung; alle Daten bleiben im Handy (localStorage).

## Was drin ist
- **Tagesrätsel** – jeden Tag ein neues, unter der Woche steigend schwerer (Mo/Di leicht … Fr/Sa schwer)
- **Serie** 🔥 – Tage in Folge mit gelöstem Tagesrätsel; **Schutzschilde** 🛡️ retten die Serie bei einem verpassten Tag (alle 7 Tage gibt's ein neues)
- **Ränge** – Anfänger → Lehrling → Geselle → **Meister** → Großmeister → … → Unsterblicher
- **Sterne** – 3 ohne Fehler, 2 bei höchstens 2 Fehlern, sonst 1; mehr Sterne = mehr Punkte
- **Tagesziel** – 3 Rätsel am Tag geben Bonuspunkte
- **22 Orden**, Bestzeiten, Monatskalender
- Senioren-freundlich: große Felder und Tasten, Fehler rot, Notizen, Rückgängig, „Extra große Schrift“

## Lokal starten
```bash
python -m http.server 8123
```
Dann http://localhost:8123 öffnen.

## Aufs Handy bringen
1. Ordner auf einem kostenlosen HTTPS-Hoster veröffentlichen, z. B. **GitHub Pages** (Repo anlegen → Settings → Pages → Branch `main`).
2. Auf dem Android-Handy die Adresse in **Chrome** öffnen → Menü ⋮ → **„Zum Startbildschirm hinzufügen“ / „App installieren“**.
3. Fertig – das Sudoku-Symbol liegt auf dem Startbildschirm und öffnet ohne Browserleiste.

## Updates
Nach Änderungen in `sw.js` die `VERSION` hochzählen, damit das Handy die neue Fassung lädt.
