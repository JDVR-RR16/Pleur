# CLAUDE.md — Werkwijze voor deze folder

Deze regels gelden voor alle werk dat Claude in deze map uitvoert.

## 1. Denk na vóór je codeert

Neem niets aan. Verberg geen onduidelijkheid. Benoem trade-offs.

Voordat je iets implementeert:

- Maak je aannames expliciet. Twijfel je? Vraag het.
- Zijn er meerdere interpretaties mogelijk? Leg ze voor — kies niet stilzwijgend.
- Bestaat er een eenvoudigere aanpak? Zeg dat. Duw terug waar nodig.
- Is iets onduidelijk? Stop. Benoem wat er onduidelijk is. Vraag door.

## 2. Eenvoud eerst

Minimale code die het probleem oplost. Niets speculatiefs.

- Geen features buiten wat gevraagd is.
- Geen abstracties voor eenmalig gebruik.
- Geen "flexibiliteit" of "configureerbaarheid" die niet is gevraagd.
- Geen foutafhandeling voor onmogelijke scenario's.
- Schrijf je 200 regels terwijl het ook in 50 kan? Herschrijf het.

Vraag jezelf af: "Zou een senior engineer dit overcomplicated noemen?" Zo ja, vereenvoudig.

## 3. Chirurgische wijzigingen

Raak alleen aan wat nodig is. Ruim alleen je eigen rommel op.

Bij het aanpassen van bestaande code:

- "Verbeter" geen aangrenzende code, comments of formatting.
- Refactor niets dat niet stuk is.
- Volg de bestaande stijl, ook als je het zelf anders zou doen.
- Zie je losstaande dode code? Meld het — verwijder het niet.

Bij orphans die door jouw wijziging ontstaan:

- Verwijder imports/variabelen/functies die door JOUW wijziging ongebruikt zijn geraakt.
- Verwijder geen reeds bestaande dode code, tenzij daarom gevraagd is.

De toets: elke gewijzigde regel moet direct te herleiden zijn tot het verzoek van de gebruiker.

## 4. Doelgericht werken

Definieer succescriteria. Itereer tot het geverifieerd is.

Vertaal taken naar verifieerbare doelen:

- "Voeg validatie toe" → "Schrijf tests voor ongeldige input, maak ze vervolgens groen."
- "Fix de bug" → "Schrijf een test die de bug reproduceert, maak hem vervolgens groen."
- "Refactor X" → "Zorg dat tests slagen vóór én na de wijziging."

Geef bij meerstaps-taken kort een plan:

```
1. [Stap] → verifieer: [check]
2. [Stap] → verifieer: [check]
3. [Stap] → verifieer: [check]
```

Sterke succescriteria maken zelfstandig itereren mogelijk. Zwakke criteria ("maak het werkend") vereisen voortdurende afstemming.
