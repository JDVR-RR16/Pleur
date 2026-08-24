# Pleur

Logboek voor koffie: je uitrusting met onderhoudsroutines, je koffies met maalstanden
per apparaat, en brouwrecepturen met timer en brouw-calculator.

Draait volledig in de browser. Geen server, geen account, geen tracking — je gegevens
staan in de opslag van je eigen browser.

## Gebruiken

Open de gepubliceerde URL en zet de app op je beginscherm:

- **iPhone** — open in Safari, tik op Deel, kies "Zet op beginscherm".
  Dit is niet optioneel: Safari wist de opslag van gewone websites na zeven dagen
  zonder gebruik. Webapps op het beginscherm zijn daarvan uitgezonderd.
- **Android** — Chrome biedt "App installeren" aan via het menu.

Maak af en toe een back-up via het knopje rechtsboven. Het bestand komt in
je Bestanden-app of downloadmap terecht en kun je in dezelfde modal terugzetten.

## Wat erin zit

- **Uitrusting** — apparaten met merk/model uit een lijst, aanbevolen onderhoudsroutines
  per type, een logboek van uitgevoerde beurten, en archiveren wat je niet meer gebruikt.
- **Koffies** — origine, proces, branding, roast dates met drinkvenster, waardering,
  en maalstanden per apparaat en brouwmethode. Plus een draaibare wereldbol met je origines.
- **Recepten** — gegroepeerd per drank, met stijlen van James Hoffmann, Lance Hedrick en
  klassieke bereidingen. Timer die het tijdschema volgt, calculator die naar jouw volume
  schaalt, en feedback die je maalstand kan bijwerken.

## Lokaal draaien

```
python -m http.server 8734
```

Daarna http://localhost:8734 openen.

## Bestanden

| | |
|---|---|
| `index.html` | de app |
| `css/style.css` | vormgeving (licht: crème, donker: bosgroen) |
| `js/db.js` | opslag in localStorage, plus back-up en herstel |
| `js/seed.js` | de meegeleverde recepturen |
| `js/land.js` | landmassa als puntenraster voor de wereldbol |
| `js/scanner.js` | barcode scannen (werkt niet op iOS — Safari kent de API niet) |
| `js/app.js` | schermen en logica |
| `sw.js` | service worker: offline gebruik en versiebeheer |
| `brewlog-artifact.html` | zelfde app als één bestand, voor gedeeld gebruik |

Bij elke wijziging aan de app moet het versienummer in `sw.js` omhoog, anders
blijven bezoekers de oude versie zien.
