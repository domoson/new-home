# Doppelhausentwurf

Lokaler, interaktiver Vorentwurf einer oestlichen Doppelhaushaelfte.
Vier masshaltige 2D-Plaene, moebliertes 3D-Modell und kollisionsgestuetzter Rundgang.
Keine Cloud, keine Konten, keine externen Bild- oder Schriftanfragen zur Laufzeit.

## Start

Node.js 22.12+ oder eine aktuelle LTS-Version und npm sind erforderlich.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Die im Terminal angezeigte URL oeffnen. Vite nimmt bei belegtem Port den naechsten
freien Port. `npm run build` erstellt `dist/`, das auf einem statischen HTTP-Host
betrieben werden kann. `npm run preview` dient der lokalen Build-Vorschau.
Nicht ueber `file://` oeffnen. WebGL2 ist fuer 3D erforderlich, 2D funktioniert ohne.

## Aktuelle Variante 6,90 x 10,50 m

Die neue EG-/OG-Skizze ersetzt die bisherige Raumaufteilung. Die Osthaelfte ist
auf KG, EG, OG und DG angepasst und eingerichtet; die Westhaelfte bleibt
ein Baukoerper ohne Innenausbau. Alte Terrasse und Vordach sind entfernt.
Nachbarschaft, Grundstueck, Garten, Carports und Fahrzeuge bleiben erhalten.

- Je Haelfte 6,90 x 10,50 m; 72,45 m2 Bruttogrundflaeche je Ebene,
  Gesamtbreite 13,80 m, Versatz 0,90 m nach Sueden
  fuer West. Gemeinsame Hauswand auf der unveraenderten, flaechengleichen Teilung.
- Bei unveraenderter Lage hat die nordwestliche Ecke des Westhauses nur noch
  ca. 2,98 m senkrechten Abstand zur Nordgrenze. Keine automatische Verschiebung;
  Abstands-/Dachflaechen und Lage beduerfen fachlicher Pruefung.
- FFB KG / EG / OG / DG: -2,45 / 0,00 / 2,97 / 5,94 m.
- Lichte Hoehen KG 2,25 m, EG/OG 2,77 m; Geschossdecken 20 cm.
- Dach 35 Grad, Innenknie 50 cm; DG-Decke bei 2,77 m, 24 cm stark.
  Die Firstoberkante liegt modelliert bei 10,27 m ueber FFB EG beziehungsweise
  10,47 m ueber dem angenommenen Gelaende und damit 3,50 cm tiefer als zuvor.
  Aussenwaende und Haustrennwand 30 cm, Innenwaende 12,5 cm und Dachpaket 24 cm sind Annahmen.
  Das Aussenwandmauerwerk ist im Grundriss schematisch im 30-cm-Raster dargestellt.
  Zentrale Querwaende an Treppe/Flur 20 cm; kein statischer Nachweis.
  DG-Innenwaende enden an der Unterkante der Spitzbodendecke.
- Treppe auf allen Geschossen 58,5 cm nach Norden verschoben, Kern z=3,50..5,50 m.
  Form und Steigungen unveraendert; Physik-Tritttoleranz 22,5 cm fuer die 19,8-cm-
  Steigungen plus Kollisionsabstand, keine Aenderung der modellierten Stufen.
- EG: Gaestebad nordwestlich, Eingang nordoestlich, deckenhoher Putzschrank neben Dusche.
  Geflieste Diele direkt an der Haustuer 6,67 m2; Flur ab vorhandenem
  Bodenwechsel mit Holzboden 5,21 m2. Keine schraege Trennung zum Wohnen;
  kurzer gerader Wandstummel suedlich der Treppe bis x=2,65 m.
  Kueche oestlich der Treppe, offener rechtwinkliger Uebergang zum Wohnen, Halbinsel
  nach Sueden. Essplatz im Suedosten, Wohnecke im Suedwesten.
- Fuenf H-Hochschraenke je 63 cm breit/60 cm tief, deckenhoch 277 cm.
  Backofen im dritten, Kuehlgeraet im vierten Modul. Arbeitszeilen 92 cm hoch
  und direkt an die Eckschraenke angeschlossen, keine zusaetzlichen Haengeschraenke.
  Rechte offene Nische von 92 bis 152 cm mit fortgefuehrter Arbeitsplatte;
  Toaster dort, Wassersprudler auf der Ostzeile suedlich der Spuele, ausserhalb des Fensterbereichs.
  Espresso und Cookit links; keine Kuechengeraete in der Diele.
  Linke Eckfront erst ab 152 cm, blinde Unterbereiche ohne behauptete Bedienfront.
  Halbinsel-Unterbau 40 cm von Sued und 35 cm von West zurueckgesetzt, echte
  freie Knievolumen unter 3 cm Platte; Barhocker mit 65 cm Sitzhoehe.
  Einzelne Frontoeffnungen geometrisch geprueft; gleichzeitige Oeffnungen,
  Toaster-Waermeabstaende/Lueftung und Herstellerfreigaben bleiben offen.
- Nordseitig im Eingang nur sieben Wandhaken auf flacher Leiste, ohne Schrank.
  Gegenueber deckenhohe Garderobe 210 x 60 cm, westlich angeschlossen;
  105 cm Freiraum zur oestlichen Eingangswand. Grosses Nordfenster dort
  entfernt. Fliesen nur oestlich x=3,30 m bis zum kurzen Wandstueck, mindestens
  1,25 m vor der Badtuerwand; anschliessender Flur mit Holzboden.
- Zweiteilige 2,80-m-Hebeschiebeanlage bis zur inneren Ostwandkante bei x=6,60 m:
  1,25 m beweglicher Fluegel und 1,55 m Festfeld, rechts 30 cm erweitert.
  Festverglasung ueber Eck mit schlankem Kopplungsprofil statt Mauerecke;
  Tragwerk und Eckanschluss ungeprueft. L-Sofa im EG auf 280 x 280 cm Gesamtmass
  mit 95 cm Sitztiefe vergroessert, Ruecken an Sued- und Westseite. Weiterhin
  20 cm Abstand zur inneren Suedwandkante. Linkes Regal und Sessel entfernt.
  Couchtisch rund, Durchmesser 90 cm, Hoehe 35 cm, weisse Platte und vier
  Holzbeine; Mittelpunkt x=1,95/z=8,50 m. Fernseher direkt an der Treppenwand,
  Sideboard unveraendert.
- Haustuer 110 x 252 cm inklusive 3-cm-Rahmen, nach innen oeffnend und
  nordseitig angeschlagen. Daneben 30 cm breites, tuerhohes Festglas-Seitenteil;
  Eingangsanlage insgesamt 140 cm breit. Normale Innentueren einschliesslich
  Kellerabschluss: 86 x 211 cm inklusive Zarge, Blatt 80 x 208 cm als Annahme.
  DG-Abstellraum und Hebeschiebeanlage bleiben weitere Sondermasse.
- OG: Bad 9,11 m2, Kind Nord 16,88 m2, Spielzimmer 7,50 m2, Kind Sued 16,73 m2,
  Flur 3,80 m2, Abstellraum 2,09 m2. Kinderzimmer mit Bett, Schreibtisch und Schrank;
  Spielzimmer niedrig moebliert. KG behaelt Technik/Lager, Keller und Hobby;
  DG Buero, Schlafen/Ankleide und Abstellraum. Moebel an neue Huelle angepasst.
- Geschoss-/Raumhoehen, Dachneigung und Kniehoehe unveraendert. Der First wird
  durch die geringere Haustiefe geometrisch niedriger, nicht durch geaenderte Hoehenparameter.
- Sofa 250 x 170 cm: lange Seite Sued, Chaiselongue West; Stuehle zum Tisch gedreht.
  Sideboard 180 x 45 x 60 cm erhalten; Regal auf 110 cm gekuerzt.
- Fenster nach Aussenansichten geteilt: breite Fenster zwei einzeln nach innen
  oeffnende Fluegel. Bereits bodentiefe EG-Fenster ohne Querholm; obere Geschosse
  behalten ihre Unterlichter. Oeffnungsbreiten, Fensterabstaende und Bruestungshoehen
  der neuen EG-/OG-/DG-Fenster folgen dem 30-cm-Raster (ausgenommen bestehende
  Kellerfenster, Eingangsfestfeld und die 2,80 m breite Terrassenanlage mit
  1,25/1,55-m-Feldern sowie die dazu gleich hohe Eckverglasung). Rasterfugen sind schematisch.
  Teilungshoehe und Profile angenaehert; keine Hersteller-/Absturzsicherungsfreigabe.
  Fensterlagen und -groessen aus der neuen Skizze angenaehert, Gartenzugang als
  zweiteilige 2,80-m-Hebeschiebeanlage mit Eckkopplung ohne Mauerstueck:
  innerer westlicher Fluegel 1,25 m beweglich, aeusseres oestliches Feld 1,55 m fest.
  Kuechenfenster und Kind-Nord-Ostfenster bei z=3,30 m, jeweils 150 cm breit,
  um 30 cm nach Norden erweitert bei gleicher Suedkante. EG zwischen Insel
  und Esstisch: Fenster statt Terrassentuer, wie ueber der Spuele
  150 x 120 cm mit 120 cm Bruestung und zwei oeffnenden Fluegeln.
  Nordkante unveraendert bei z=6,30 m, nach Sueden bis z=7,80 m verbreitert.
  Kueche unveraendert; das Fenster liegt nun oberhalb der 92 cm hohen Insel.
  Spielzimmerfenster um 30 cm nach Norden auf z=6,30 m verschoben,
  150 x 150 cm mit 90 cm Bruestung; Nordkante fluchtet mit EG und DG.
  Kuechenfenster weiterhin 120 cm hoch bei 120 cm Bruestung. DG-Giebelfenster
  beide bodentief 150 x 210 cm bei z=3,30 und 6,30 m. Horizontale Teilung
  bei 60 cm: unten fest verglast, nur die beiden bisherigen oberen Fluegel
  oeffnen nach innen. Oberkante bei 210 cm unveraendert.
  DG-Buerofenster 60 cm nach Sueden verschoben, Trennwand zum Schlafzimmer
  30 cm nach Sueden auf z=5,10 m: Buero gewinnt 0,915 m2, Schlafzimmer
  entsprechend kleiner. Schraenke beidseits folgen der Wand; niedriger
  Bueroschrank auf 120 cm gekuerzt, um den Fensterfluegel freizuhalten.
  Festes Unterlicht allein ist kein Absturzsicherungsnachweis;
  Verglasung, Absturzsicherung und Beschlaege fachlich zu planen.
  EG-Suedostecke fest verglast ab z=9,30 m, 30 cm nach Norden verlaengert:
  90 cm bis zur inneren Suedwandkante plus 30 cm geoeffnete Wandtiefe.
  Beide Glasflaechen treffen sich in der Wandmitte am 8-cm-Eckprofil bei
  x=6,75/z=10,35 m, Oberkante 252 cm wie die Hebeschiebeanlage.
  Mauerecke unter dem Sturz entfernt; kein nachgewiesenes Tragwerk,
  keine Herstellerfreigabe. Die unveraenderte Sitzbank steht teilweise vor dem Festglas.
  Nordbadfenster im EG unveraendert 120 x 60 cm mit 180 cm Bruestung;
  OG-Lichtband 240 x 90 cm mit schlankem Mittelpfosten, nach unten erweitert
  auf 150 cm Bruestung bei unveraenderter Oberkante von 240 cm.
  Suedwestliche EG-/OG-Fenster fluchten 60 cm von der Trennwand entfernt
  uebereinander. Die beiden Fenster von Kind Sued sind je 180 x 150 cm mit
  90 cm Bruestung; das oestliche schliesst buendig mit der Ostkante der
  Terrassenverglasung ab. Das Flurfenster ist 90 x 150 cm, der Schrank in Kind
  Sued steht an der Nordwand. Das Ostfenster von Kind Nord beginnt wie das
  Kuechenfenster bei z=3,30 m und ist 150 cm breit.
- Kellerfenster 90 x 75 cm; oestliches Fenster 1,20 m von der suedlichen
  Aussenkante entfernt. Beide Lichtschaechte
  mittig, 130 x 50 cm im Grundriss (aus Zeichnung angenaehert, kein Herstellermass).
- EG-Dusche im Suedwesten des Bades, WC/Waschtisch im Norden; Nord-Vorwand 8 cm tief/120 cm hoch
  ist Annahme, von der Raumflaeche abgezogen.
- OG-Bad als T-Grundriss nach Vorlage: raumhohe Waschtisch-Vorwand 15 cm mittig
  (x 1,30-1,45 m, 1,30 m lang) mit Waschtisch 130 x 50 cm nach Osten, ein Becken
  60 cm mittig und je 35 cm Ablage beidseitig; dahinter westlich bodengleiche
  Dusche 96 x 126 cm im Nordwesten (Nordfenster) und WC im Suedwesten, getrennt
  durch eine 15-cm-Installationswand fuer Spuelkasten und Duscharmatur.
  Durchgaenge je 85 cm statt 65 cm der Vorlage; Wanne 180 x 80 cm an der Ostwand
  unter dem zweiten Nordfenster, 70 cm Gang zwischen Waschtisch und Wanne,
  1,15 m freie Zone vor der Tuer.
  Dusche ohne Glaswand (offener Durchgang wie Vorlage). Leitungen und Anschluesse nicht fachlich geplant.
- DG-Abstellraumtuer 73 x 160 cm, rechteckig und ueber den Schwenkweg unter dem
  Dach geprueft. Kein aufrechter Durchgang; der Rundgang hat keine Duckfunktion.
- Die Planungsannahmen zeigen Modellflaechen und die Beschriftungen der neuen
  EG-/OG-Vorlage. Keine erfundenen KG-/DG-Referenzflaechen. EG-Diele ca. 13,42 m2
  statt 12,0 m2 der Skizze; Wandstaerken/Nische fuehren zu Abweichungen.
  Wohnflaechen: 3 % Abzug; im DG zusaetzlich Hoehengewichtung unter 1 / 2 m.
  Tuerlaibungen nicht eingerechnet. Kein WoFlV-Nachweis.
- Treppenannahme: 1,90 x 2,00 m, 15 Steigungen, 30 cm gerade Auftritte,
  DG-Grundrisspfeil korrigiert auf die Aufwaertsrichtung, 3D-Stufen unveraendert.
  nominell 85 cm Laufbreite und 20 cm modellierte Staerke. Begehbare Physik
  ersetzt keine Pruefung von Treppennorm, Kopffreiheit oder Tragwerk.
- Lage und Fenstermasse sind aus Screenshots angenaehert, nicht vermessen.
  Abstandsrecht, Tragwerk, Brand-/Schallschutz und Genehmigung bleiben offen.

Aktuelle Modellquelle: `src/providerPlan.ts`; gemeinsame Hoehen: `src/model.ts`.
Fokussierte Pruefung des neuen Entwurfs:

```sh
npx vitest run src/providerPlan.test.ts src/compactVariant.test.ts src/kitchenLayout.test.ts src/kitchenStorage.test.ts
npx playwright test tests/provider-plan.spec.ts
npm run build
npm run lint
```

Die neuen Browsertests pruefen Grundrisse, Schnitt, Flaechentabelle, bewegtes
3D-Bild sowie alle sechs Treppenrichtungen und Raumzugaenge mit Kollisionen
auf Desktop und Mobil. Aeltere layoutbezogene Tests enthalten noch die Masse
des vorherigen Entwurfs und sind nicht als Nachweis dieses Entwurfs geeignet.

## Historische Dokumentation

**Die folgenden Abschnitte dokumentieren den vorherigen Entwurf.** Insbesondere
Hausmasse, Innenaufteilung, Terrassen, Fenster, Treppen und Flaechen darin gelten
nicht mehr. Fuer den aktuellen Stand gelten der Abschnitt oben und die
Planungsannahmen in der Anwendung. Umgebungsmodelle bleiben weiterverwendet.

### Bisherige Bedienung

- KG, EG, OG und DG waehlen; Raeume im Plan oder in der Raumliste anklicken.
- 2D: Plus/Minus zoomt; auf freier Zeichenflaeche ziehen verschiebt den vergroesserten
  Plan. Der Rahmenknopf setzt die Ansicht zurueck. Download exportiert das aktuelle SVG.
- Mausrad ueber dem 2D-Plan oder Schnitt zoomt stufenlos wie in 3D, ohne Seitenscrollen.
- Hover bzw. Antippen zeigt Objektmasse: Moebel samt Hoehe/Aufstand, Wandteilstuecke
  mit Gesamtlaenge und Staerke, Tueren/Fenster mit Brüstung, Stufen/Podeste, Raeume,
  Terrasse, Lichtschaechte und Dachfenster. Bei zusammengesetzten Raeumen werden
  die beruehrte Teilflaeche und die gesamte Raumflaeche getrennt benannt.
- Massband: zwei Punkte setzen, weitere Messungen bleiben stehen. Ecken fangen
  innerhalb von 8 Bildschirmpixeln; Shift sperrt die Achse. Escape bricht den
  begonnenen Strich ab, Papierkorb/Delete loescht. SVG-Export enthaelt Messlinien.
  Messungen gelten fuer den aktuellen Plan und werden bei Geschosswechsel
  oder Zuruecksetzen geloescht. Anzeige bis auf Modellmillimeter, keine Vermessung.
- Scherensymbol: Gebaeudeschnitt Nord-Sued oder West-Ost. Schieberegler versetzt die
  Schnittlage. Angezeigt werden nur geschnittene Bauteile, Geschosskoten, lichte
  Hoehen, Dachpaket und Dachfenster. Hover zeigt die lokale Dachhoehe, Bauteiltitel
  enthalten Hoehen und Laengen. Auch hier gibt es ein freies Zweipunkt-Massband.
  Achs-/Schnittlagenwechsel loescht Schnittmessungen. Kein baurechtlicher Nachweis.
- 3D: Ziehen dreht, Mausrad zoomt, rechte Maustaste verschiebt. Ohne Dach wird das
  ausgewaehlte Geschoss mit voller Wandhoehe gezeigt. Das Mauer-Symbol schaltet
  optional auf 1,05 m hohe Schnittwaende um. Dach einschalten
  zeigt das gesamte Gebaeude mit voller Wandhoehe und Satteldach.
- Rundgang: WASD oder Pfeiltasten bewegen; Mausziehen aendert die Blickrichtung.
  Der Mauszeigerknopf aktiviert optional Pointer Lock; Escape gibt die Maus frei.
  E bzw. der Tuerknopf schaltet die naechste Tuer innerhalb von 2,1 m um.
  Mausrad am Fadenkreuz: hoch oeffnet, herunter schliesst die avisierte Tuer bzw.
  das Fenster prozentual, bis 3 m Entfernung. Auch die freie Oeffnung bleibt bei
  geoeffnetem Fluegel anvisierbar. Waende verdecken Ziele; kein Zoom im Rundgang.
  Tueren starten offen und sind physisch kollidierend; die Hebeschiebetuer ist verglast.
  Geschlossene Tueren blockieren, geoeffnete geben nur die reale Oeffnung frei.
  Oeffnen oder Schliessen durch den eigenen Koerper wird verhindert.
- Szene: Tueren und oeffenbare Fenster direkt anklicken zum Oeffnen/Schliessen.
  Im Rundgang stellt das Mausrad die avisierte Oeffnung stufenweise ein.
  Fassadenfenster schwenken nach innen, Dachfenster kippen modellhaft nach innen.
  Die EG-Hebeschiebetuer hebt geringfuegig an und verschiebt sich im Osthaus bis
  1,20 m, im Westhaus bis 1,50 m vor das
  Festfeld. Festverglasungen bleiben fest. 2D zeigt das statische Oeffnungsschema,
  keine Live-Fluegelstellungen. Der Schwenkweg wird immer gegen
  den Spieler geprueft; das ist kein vollstaendiger Beschlag-/Moebelkollisionsnachweis.
- Szene: Uhrzeit und drei Vergleichstage veraendern den Sonnenstand ohne Kamerasprung.
  Neun Putz-, sechs Dach-, sieben Rahmenfarben und acht Fassadenkompositionen sind frei kombinierbar.
  Bei eingeschaltetem Dach zoomt das Haussymbol zur Fassade; Ansicht zuruecksetzen
  zeigt wieder das ganze Grundstueck. Acht Holztoene und drei Profile sind waehlbar;
  das L-Vordach folgt dem Holzton auch bei reiner Putzfassade.
  Standard fuer beide Haelften: Rahmen Eiche (3. Farbe), Putz Muschelweiss
  (4. Farbe), Holz Eiche hell (4. Ton). Terrassentuer, Fenster und feste
  Verglasungen bleiben transparent; Innentueren sind deckend.
- Szene / Haushaelfte: Putz, Dach, Rahmen, Holzton, Profil und Bekleidungsfelder
  fuer Ost und West unabhaengig einstellen. Beide Haelften sind voll eingerichtet.
- Szene / Raumbeleuchtung: Haushaelfte und Geschoss waehlen; Deckenleuchten
  raumweise oder fuer das ganze Geschoss schalten. Treppe und Partylicht sind eigene
  Schaltkreise. Schalter bleiben bei Ansichtswechseln erhalten, nicht beim Neuladen.
  Anfangs ist nur das KG beleuchtet. Die Uhrzeit umfasst auch die ganze Nacht.
- Szene / Beleuchtungsmodus: Raumlicht verwendet Leuchten, Schatten und
  angenaehertes Reflexionslicht. Global stellt die fruehere helle Aufhellung
  mit Geschoss-Fuelllichtern im Rundgang wieder her und ist beim Start
  standardmaessig aktiv. Raumleuchten und ihre
  Reflexionswirkung pausieren dabei. Ihre Schalterstaende bleiben erhalten,
  auch beim Geschosswechsel; der Moduswechsel versetzt die Kamera nicht.
  Ein Raum- oder Geschosslichtschalter aktiviert automatisch wieder Raumlicht,
  damit die Schaltaktion nicht durch den globalen Modus wirkungslos bleibt.
- Nachbarschaft und Garten/Hecke/Zaun sind getrennt abschaltbar. Sie erscheinen in
  Gesamtmodell, Rundgang und Kelleransicht. Die 2D-Zeichnung zeigt weiter Haus Ost.
- Im KG startet das Gelaende transparent. Das Szenenmenue schaltet die Transparenz um.
- Touch: Pfeiltasten gedrueckt halten, auf der Szene ziehen zum Umsehen.
- Raeume & Flaechen oeffnet die Seitenleiste auf schmalen Bildschirmen.
- Raum betreten und die Geschosstasten setzen einen neuen Einstiegspunkt.
  Das kleine Geschossfeld im Rundgang zeigt das tatsaechlich erreichte Geschoss;
  Seitenleiste und Geschossauswahl bleiben beim ausgewaehlten Einstieg.
- DG-Traufstreifen unter 1,20 m sind durch geschlossene Waende abgetrennt und
  nicht als Raumflaeche gerechnet. Kein separater Dachstauraum.
- Nur ein Hauptentwurf mit kompakter U-Wendeltreppe. Keine Vergleichsgrundrisse oder
  gespeicherte Entwurfsauswahl. Szeneneinstellungen bleiben beim Geschosswechsel
  erhalten, werden beim Neuladen zurueckgesetzt. Kein CAD-Editor.

## Entwurf

### Verbindlichkeit der Hoehen

Die Hoehen sind zentral in `src/model.ts` hinterlegt und werden von Schnitt,
3D, Treppen, Massanzeigen und Beleuchtung gemeinsam verwendet. Planungsannahmen
fuer Holzfertigbau, keine garantierten Hersteller-Standardmasse oder KfW-40-Nachweise:

| Bezug ab FFB EG | Modellmass |
| --- | --- |
| FFB KG / EG / OG / DG | -2,74 / 0,00 / +3,00 / +6,00 m |
| Lichte Hoehe KG / EG und OG | 2,40 / 2,65 m |
| Kellerdecke / beide Holzdecken gesamt | 34 / 35 cm |
| Freie Aussenwaende / Haustrennwand-Platzbedarf | 38 / 40 cm |
| Dach normal / vertikal bei 35 Grad | 35 / 42,727 cm |
| Innenknie ueber FFB DG / absolute UK innen | 0,50 / +6,50 m |
| Aussenkante Wand / UK Dachpaket | +6,234 m |
| Aussenkante Wand / OK Dachflaeche | +6,661 m |
| First innen (UK Verkleidung) | +9,735 m |
| First Dachflaeche / OK Firstabschluss | +10,162 / +10,232 m |
| OK Gelaende / Urgelaende, eben angenommen | -0,20 m |
| OK Firstabschluss ueber angenommenem Gelaende | 10,432 m |

Die rund +6,66 m an der Aussenwand beziehen sich auf die OBERSEITE der
Dachflaeche, nicht auf die Unterseite des gesamten Dachpakets. Von innen nach
aussen faellt die Dachunterseite ueber 38 cm Wandstaerke um rund 26,6 cm ab.
Firstabschluss: 7 cm zusaetzlicher, schematisch modellierter Zuschlag, kein
Produktmass. Die 35-cm-Pakete muessen alle genannten Schichten einschliesslich
Schallschutz, Installation, Bodenbelag bzw. Dachdeckung aufnehmen. Hersteller
kann groessere Dicken benoetigen; vor Festlegung bestaetigen lassen. Wandaufbau
mit Putz/Traegerdaemmung, gedaemmtem Holzstaender, Installation und Beplankung
ist nur ein Konzept. Energiebilanz, Feuchte-, Brand- und Schallschutz sind offen.
Keller-Aussenhuelle schematisch 38 cm gesamt, nicht als Holzbau festgelegt;
Beton, Perimeterdaemmung, Abdichtung und 30 cm Boden-/Fundamentpaket unbemessen.
Aussenmasse und Hauspositionen bleiben unveraendert; lichte Flaechen werden kleiner.

**3 m Grenzabstand sind keine baurechtliche Freigabe.**
[Art. 6 BayBO](https://www.gesetze-bayern.de/Content/Document/BayBO-6), abgerufen
am 15.09.2026 (Fassung gueltig ab 01.05.2026), bemisst H ab massgeblicher
Gelaendeoberflaeche; bei 35 Grad kommt an der Traufe ein Drittel der Dachhoehe
hinzu. Grundregel 0,4 H, mindestens 3 m; oertliche Satzungen koennen abweichen.
Reines Rechenbeispiel mit obigen Annahmen und Firstzuschlag:
H = 6,661 + 0,20 + (10,232 - 6,661) / 3 = 8,052 m,
0,4 H = rund 3,22 m. Schon dies liegt ueber 3 m. Kein grundstuecksbezogener
Abstandsflaechennachweis; insbesondere Giebelseiten separat berechnen.
Vor Hausbestellung: Hersteller-Schnitt mit maximalen Gesamtaufbauten und
OK First, vermessenes massgebliches Gelaende, oertliche Satzungen/Bebauungsplan,
Baugrenzen, Giebelflaechen und Doppelhausanschluss fachlich zusammen pruefen.
Die Grundstuecksabstaende werden nicht automatisch mit zunehmender Hoehe vergroessert.

### EG-Suedfenster Osthaus

Die Schiebeanlage sitzt am Ostrand: 2,40 x 2,35 m, davon je 1,20 m Schiebefluegel
und Festfeld. Sie reicht von x = 4,220 bis 6,620 m. In der Ostwand schliesst sich
eine 0,70 x 2,35 m grosse Festverglasung bei z = 8,920 bis 9,620 m an.
Der 38-cm-Eckpfosten bleibt bestehen; keine stuetzenlose Glasecke.
Das westliche Sued-Festfeld ist auf 1,05 x 2,35 m verkleinert und beginnt bei
x = 2,60 m. Alle drei Glasbereiche sind bodentief mit gleicher Oberkante.
Die Terrassensitzgruppe im Osten ist um 65 cm nach Sueden versetzt, damit vor
dem neuen Ausgang ein 1 m tiefer Vorbereich frei bleibt. Terrassengroesse unveraendert.
Das Westhaus behaelt die bisherige Fensteraufteilung. Masse sind Modellmasse;
Eckstatik, Stuerze, Anschlussdetails und tatsaechliche lichte Durchgangsbreite
sind durch Fachplanung und den gewaehlten Hebeschiebetuer-Hersteller zu pruefen.

### Beleuchtung

Alle Raeume beider Haushaelften haben sichtbare Deckenleuchten, auch ohne
Moeblierung. Im DG folgen die Gehaeuse der Dachschraege. Das Wohnzimmer hat
drei Lichtpunkte; Wohnraeume warmweisses, Baeder und Nebenraeume neutraleres Licht.
Die Quellen haben quadratischen Entfernungsabfall und werfen Schatten an
Waenden, Decken und Moebeln. An der westlichen Treppenwand jedes Geschosses
sitzt eine kompakte 600-lm-Wandleuchte mit eigenem Treppen-Schaltkreis.
Partyspots sind getrennt vom normalen Raumlicht. Im Modus Raumlicht
entfallen die bisherigen unsichtbaren Geschoss-Fuelllichter. Sonne und
gerichtetes Himmelslicht sind abgeschattet; ein schwaches Restlicht verhindert
vollkommen schwarze Flaechen. Zusaetzliches diffuses Himmelslicht hellt die
Aussenflaechen einschliesslich Nachbarhaeusern auch auf der Schattenseite auf.
Es folgt dem Sonnenstand und der Flaechenausrichtung, ohne geschlossene
Innenraeume oder den Keller global aufzuhellen. Die Himmelsabschattung durch
Nachbarn, Vegetation und Vordaecher wird fuer diesen diffusen Anteil nur
vereinfacht angenaehert, nicht physikalisch integriert.
Sonnen- und Himmelslicht entfallen nachts.

Im Modus Raumlicht werden nur die kuenstlichen Lichtquellen des betrachteten
Geschosses beider Haelften ausgewertet. Im Rundgang folgt dies automatisch
dem erreichten Geschoss. Schalterstaende und leuchtende Diffusoren bleiben
in anderen Geschossen erhalten, beleuchten dort aber nicht die Umgebung.
Viele gleichzeitig eingeschaltete Quellen koennen den ersten Bildaufbau
insbesondere bei Software-Rendering verlangsamen.

Zusaetzliches diffuses Reflexionslicht ist an den jeweiligen Raum-Schalter
gekoppelt und auf dessen Raumvolumen begrenzt, fuer Ost und West unabhaengig.
Decken erhalten mehr warmes Boden-Reflexionslicht, Waende etwas weniger;
Materialfarbe und Oberflaechenausrichtung bleiben beruecksichtigt. Keine
zusaetzlichen Schattenkarten fuer diese Naeherung. Nicht als echter
Lichttransport, Spiegelreflexion oder moebelgenaue indirekte Verschattung
berechnet. Zusaetzliches neutrales, indirektes Tageslicht bleibt auch bei
ausgeschalteten Leuchten aktiv: Fassadenfenster, Terrassenverglasung und
Dachfenster werden ihren Raeumen zugeordnet. Die Aufhellung richtet sich
nach Glasflaeche relativ zur Raumflaeche und nimmt mit der Entfernung zum
flaechengewichteten Fenstermittelpunkt ab. Beide Haushaelften und alle
Geschosse erhalten diesen Anteil unabhaengig vom aktiven Lampengeschoss.
Lichtschaechte im KG lassen nur einen stark reduzierten Anteil zu;
fensterlose Raeume erhalten keinen eigenen Tageslichtanteil. Nachts und
im globalen Vergleichsmodus entfaellt diese Aufhellung.
Dies ist eine Raum-Naeherung ohne berechnete Mehrfachreflexionen,
indirekte Moebelschatten oder Lichtweitergabe durch Innentueren. Fenster-
und Nachbarverschattung beeinflussen weiterhin das direkte Sonnenlicht,
nicht den hier geschaetzten diffusen Innenraumanteil. Keine
photometrisch kalibrierten Leuchtendaten. Das schwache Restlicht ist eine
Darstellungshilfe. Global ist eine bewusst gleichmaessig helle Entwurfsansicht.
Fuer Tageslicht im Innenraum
den Rundgang mit geschlossener Gebaeudehuelle verwenden: die offene
Geschossansicht laesst zusaetzlich Licht von oben einfallen. Kein Lux-,
Belichtungs- oder Elektroplanungsnachweis.

### Nachbarhaus Nr. 8

Das oestliche Nachbarhaus Nr. 8 ist anhand der bereitgestellten
Ansichten als eigenes schematisches Umgebungsmodell angelegt.
Heller zweigeschossiger Baukoerper, graues Satteldach mit Ost-West-First,
geschlossene Giebel, Dachfenster, langer Suedbalkon und westlich unmittelbar
angebaute niedrige Flachdachgarage mit suedlicher Zufahrt und Vorgarten.
Die verzerrte Fotogrammetrie ist nicht als Fassadentextur uebernommen.

Schematische Modellmasse: Haus ca. 10,7 x 8,8 m, Traufe weiterhin 5,50 m
ueber Gelaende; Garage mit angepasster Breite bis direkt an die Ostgrenze,
Hoehe 2,60 m. Die lokale Dachneigung
38 Grad wird mit dem Grundriss transformiert. Lage, Orientierung und Grundflaeche
sind angenaehert. Fensteraufteilung,
Balkondetails, Dachaufbauten und Vegetation sind angenaehert. Ohne vermessene
Bestandsmasse ist dies kein belastbarer Abstands- oder Verschattungsnachweis.
Das bestehende Haus und die Garage auf dem vorhandenen Grundstueck werden nicht
modelliert: Dort bleibt ausschliesslich der geplante Doppelhausentwurf.
Weiter entfernte Nachbarhaeuser bleiben schematisch; Dachanschluesse haben
den gleichen Gelaendebezug wie die Hauskoerper und geschlossene Untersichten.

### Direkte Nachbarn Nr. 12, 50 und 52

Die drei Platzhalter fuer Nr. 12, 50 und 52 sind durch eigenstaendige,
an den bereitgestellten Ansichten orientierte
Modelle ersetzt. Dachkoerper sind geschlossen; Dachfenster, Ziegelreihen,
Schornsteine, Rinnen, Fallrohre, Fassadenfenster und Terrassen sind modelliert.

| Haus | Schematischer Hauskoerper, ca. | Traufe / lokale Dachneigung | Markante Merkmale |
| --- | --- | --- | --- |
| Nr. 12 | 12,5 x 9,2 m | 5,10 m / 34 Grad | Graubraunes Walmdach, oestliche Garage, Hoehe 2,60 m, dunkellaubiger Baum im rueckwaertigen Garten |
| Hallerstrasse 50 | 12,3 x 9,8 m | 5,25 m / 39 Grad | Rotes Satteldach, Suedbalkon, niedriger Ostanbau, Hoehe 2,75 m, fuenf Solarmodule |
| Hallerstrasse 52 | 11,5 x 9,8 m | 5,20 m / 36 Grad | Heller Putz, graubraunes Satteldach, westliche Zufahrt, Suedterrasse und Garten |

Nr. 12 ist von An der Roeth erschlossen; Nr. 50 und 52 haben noerdliche Zufahrten.
Die Modellgeometrie bleibt ausserhalb des eigenen Grundstuecks.
Nachbargrenzen sind nicht neu vermessen oder verbindlich rekonstruiert.
Alle genannten Masse, Dachformen, Fensteraufteilungen, Solarfeld- und
Gartendetails sind Bildschaetzungen, keine gesicherten Bestandsangaben.
Der geplante Doppelhausentwurf bleibt unveraendert. Die Umgebungsmodelle folgen
dem Schalter Nachbarschaft.

Die Umgebungsbaeume haben leicht unregelmaessige, gegliederte Laubkronen,
dezente Farbvariation und verjuengte Astgabeln. Ihre Verteilung folgt jetzt
48 abgelesenen Kronen-/Gehoelzflaechen im zuletzt bereitgestellten Draufblick
(995 x 720 Pixel), statt automatisch gesetzten Einzelbaeumen. Drei Dachpunkte
an Nr. 12, 50 und 8 registrieren das Bild auf die bestehende Lagebasis.
Kronenmitten und zwei Radien bestimmen Standort und Ausdehnung; die grosse
dunkle Krone nordwestlich, der niedrigere noerdliche Gehoelzstreifen und die
Gruppen in den gegenueberliegenden Gaerten sind separat erfasst.
Dies ist keine exakte Baumzaehlung: zusammenhaengende Kronen koennen mehrere
Staemme verdecken, Schraegansicht und Schatten erschweren die Ablesung.
Hoehen, Baumarten und Kronenmasse sind geschaetzt, nicht vermessen; natuerliche
Kronenueberhaenge ueber Modellgrenzen sind moeglich. Alle erfassten
Kronenmittelpunkte liegen ausserhalb unseres Grundstuecks. Dessen vier
Gartenbaeume und uebrige Bepflanzung bleiben unveraendert. Instanzierte
Laubgruppen begrenzen den Detailaufwand ohne einzelne Blaetter zu simulieren.

Nutzerkorrektur: Die Garage von Nr. 8 steht unmittelbar an unserem oestlichen
Grenzzaun, die Garage von Nr. 12 unmittelbar an unserem westlichen Grenzzaun.
Ihre grundstuecksseitigen Waende und Flachdachkanten folgen jeweils der gesamten
Grenzlinie ohne Abstand oder Ueberstand. Hausanschluesse und Wohnhauspositionen
bleiben erhalten; dadurch sind die Garagengrundrisse leicht trapezfoermig.
Tore, Zufahrten und 2D-Umrisse folgen derselben Anpassung. Dies ersetzt die zuvor
aus der Karte geschaetzten seitlichen Garagenabstaende, nicht die ungesicherten
Annahmen zu Laenge, Hoehe und Konstruktion.

### Umfeld und suedliche Strassenseite

Das Umfeldmodell ist eine schematische Entwurfsumgebung. Hauspositionen,
Stellplaetze und Strassenverlaeufe sind angenaehert; es ist keine amtliche
Georeferenzierung und kein vermessener Abstands- oder Verschattungsnachweis.
Pixelablesung und Gebaeudevereinfachung begrenzen die Genauigkeit.

Mehrere schematische Nachbargebaeude und beide geknickten Strassenkanten
ersetzen die gleichmaessigen Platzhalter. Suedlich stehen nun die Paare
19/17, 15/13, 11b/11a, 9b/9a, das Einzelhaus 7 und 5a/5 mit Nebengebaeuden.
Nr. 4 und 6 sind ebenfalls getrennt angeschlossene Baukoerper. Kleine Erker,
Rueckspruenge und die getrennten Teile des Anbaus von Nr. 50 bleiben vereinfacht.
Grundstuecksgrenzen sind Bodenlinien, keine behaupteten vorhandenen Zaunanlagen.
Altbestand und Garage unter dem Marker werden weiterhin nicht dargestellt.

Die zusaetzliche Vogelperspektive dient der vorlaeufigen Zuordnung von Farben
und Hoehen: 9a/9b mit niedrigerem roten Dach (Traufe 5,1 m, 30 Grad),
11a/11b mit grauem Dach (5,6 m, 40 Grad), 13/15 mit grauem Dach und Gauben
(5,4 m, 42 Grad), 17/19 mit rotbraunem Dach (5,6 m, 38 Grad),
Nr. 7 mit hoeherem grauem Dach, drei Gauben und Dachfenstern (5,9 m, 42 Grad).
Helle weissliche Fassaden, Fenster, Rinnen und Schornsteine sind angenaehert.
Diese Hausnummernzuordnung, Gaubenzahlen, Dachformen und Meterwerte sind
Bildinterpretationen, keine gesicherten Bestandsdaten. Nicht deutlich sichtbare
Gebaeude bleiben schematisch; die weiter entfernte Flachdachreihe ist nicht erfasst.

Der Aussenanlagenplan zeigt dieselben Hausumrisse wie 3D. Nachbarobjekte lassen
sich auswaehlen und mit dem vorhandenen Massband an Haus- und Gebaeudeecken
messen. Angezeigte Nachbarmasse sind schematische Modellmasse und nicht vermessen.

### Parken und Garten

Je Terrasse 5,00 x 3,00 m Hauptflaeche und ein Ruecklauf von 0,75 x 1,50 m
ums aeussere Hauseck: zusammen 16,125 m2 statt zuvor 18 m2. Ost liegt die
Hauptflaeche bei x=2,75 bis 7,75 m, z=10 bis 13 m; der Ruecklauf bei
x=7,00 bis 7,75 m, z=8,50 bis 10 m. West gespiegelt mit 1,20 m Suedversatz.
Die seitlichen Lichtschaechte bleiben frei. Grundriss, Messobjekte, Aussenplan,
3D-Dielen und Moeblierung verwenden dieselben Terrassendaten.

Je Haushaelfte zwei unabhaengig von An der Roeth erreichbare Stellplaetze:
ein Holzcarport aussen im Suedosten bzw. Suedwesten und ein offener Platz
daneben zur Gartenmitte. Keine hintereinander blockierten Stellplaetze.
Carport-Aussenmass 3,00 x 6,00 m, vier 16-cm-Pfosten, lichte Breite 2,68 m;
beide Stellflaechen jeweils mindestens 2,50 x 5,00 m frei von Pfosten.
Die ueberdachte Stellflaeche liegt 0,125 m von der Zaunkante und 0,375 m von
der Lamellenwand entfernt; der Wagen steht mittig darauf, also 0,125 m zur
Zaunseite versetzt.
Die Dachkante haelt genau 3,00 m kuerzesten senkrechten Abstand zur schraegen
Suedgrenze. Dies war bereits fuer beide Carports erreicht; die Carport- und
Tonnengruppen wurden deshalb nicht weiter zur Strasse verschoben.
Der offene Stellplatz ist 5,00 m lang, mit mindestens 0,45 m Vorflaeche in
Fahrtrichtung bis zur Suedgrenze. Wegen der schraegen Grenze ist die Vorflaeche
an der anderen Kante etwas laenger. Zwischen den beiden liegt ein 0,90 m
breiter Fuss-/Fahrradweg; auch der Hausweg hat 0,90 m Anschlussbreite.
Beide Carports, Stellplaetze, Zufahrten und Seitenwege sind parallel zur
jeweiligen aeusseren Zaunlinie gedreht; die aeussere Carportkante liegt
jeweils 18 cm innerhalb der Grenze.
Die aeusseren Nachbargrenzen bleiben unueberschritten; keine Bauteilueberstaende.

Schlankes Pultdach mit 3 Grad Neigung (rund 5,2 Prozent), standardmaessig ohne Begruenung: anthrazitgraues,
beschichtetes Stahlprofilblech auf sichtbarem Holztragwerk, seitliche
Abschlussbleche. Rund 31,5 cm Hoehenunterschied auf 6 m; niedrige Dachunterkante
hinten bei Modellhoehe 2,50 m, hohe Einfahrt vorne bei 2,81 m (Gelaende -0,14 m).
Rueckwaertige Rinne mit Fallrohr innerhalb der eigenen Grundflaeche;
kein freier Wasserablauf zum Nachbarn oder auf die Strasse vorgesehen.
Das ist ein preisbewusstes Materialkonzept, kein kalkuliertes Angebot oder
Lebensdauerversprechen. 3 Grad ist eine uebliche Mindestneigung fuer Trapezblech
ohne Querstoss; konkretes Profil, Ueberlappungen und Dichtungen nach Herstellervorgaben
auswaehlen; Korrosionsschutz, Befestigung, Kondensatschutz/Belueftung,
Schall bei Regen und Regenwasseranschluss sind noch auszuarbeiten.
Alternativ lassen sich beide Carports gemeinsam auf ein bepflanztes Gruendach
umschalten: sichtbare Substratschicht, umlaufender Kiesstreifen, Randprofile,
dreidimensionale Sedumrosetten in unterschiedlichen Toenen und einzelne Blueten.
Der Aufbau folgt derselben Dachneigung; die Blechprofilrippen sind dabei verdeckt.
Schematische extensive Begruenung, kein gepruefter Systemaufbau: zusaetzliche
Nasslast, Tragwerk, wurzelfeste Abdichtung, Drainage, Schubsicherung und
Entwaesserungsanschluss muessen fachlich geplant werden.
Offene Einfahrt, geschlossene Holzrueckwand, Zaunseite offen (dort steht die
Nachbargarage). Zur Gartenseite eine durchgehende vertikale Lamellenwand zwischen
den Pfosten: 6 x 6 cm Holzlamellen im 10-cm-Raster (4 cm Fugen), 6,5 cm ueber dem
Belag beginnend und bis unter den geneigten Randtraeger reichend, im Holzton der
Fassade. Frontal bleibt sie zu 40 Prozent offen und belueftet; ab etwa 34 Grad
Schraegsicht schliessen sich die Fugen optisch, sodass vom Wohnzimmer und von der
Terrasse aus das Auto verdeckt ist. Zwischen Karosserie und Lamellen bleiben rund
0,67 m, zur Zaunseite rund 0,66 m bis zur Grenze: Tueren lassen sich bis zur ersten
Raste oeffnen, ein volles Aufschwenken braeuchte einen breiteren Carport. Das
fruehere kurze Lamellenfeld an der Zaunseite ist entfernt. Die Lamellenwand
kollidiert im Rundgang als durchgehende Flaeche.
Dahinter je eine Tonnenflaeche 2,25 x 0,90 m fuer Kompost, Restmuell und Papier:
drei schematische 240-l-Tonnen mit je 60 x 75 cm Grundflaeche. Separate
Bedienflaeche 0,90 m tief auf der Nordseite, ueber den Seitenweg erreichbar;
konkrete Tonnenabmessungen beim Entsorger pruefen. Keine Einengung der Stellflaeche.
Holztoene folgen Ost und West getrennt der Hausfassade. Darstellung in 3D
mit Dach sowie im Rundgang. Rueckwaende, Pfosten und Tonnen kollidieren.

Der Baum-Reiter oeffnet den separaten 2D-Aussenanlagenplan fuer beide Haelften:
Hauskoerper, Terrassen, Carports, Stellplaetze, Wege, Tonnen und Zaunabschnitte
mit echten Kantenmassen, Aussparungen der Einfahrten und 3-m-Suedabstand.
Objekte auswaehlen fuer Detailmasse; Bemaßung, Zoom, Verschieben, freies Massband
mit Eckfang und SVG-Export sind vorhanden. Der Export heisst
Hausentwurf-Aussenanlagen.svg. Die 2D-Geometrie stammt aus denselben Daten wie 3D;
Masse beider Parkbereiche werden entlang gedrehter Kanten statt an
achsparallelen Boxen gemessen. Auswahl- und Tastaturfokuskonturen bleiben
2 Bildschirmpixel breit, ohne vergroesserte native SVG-Fokusringe.
Rasenfugen-Fahrspuren statt vollflaechig gepflasterter Zufahrt, gruene
Zwischenstreifen und durchlaessige Stellflaechen; der breite mittlere
Suedgarten bleibt zusammenhaengend. Keine dekorativen Autos im Gartenmodell.
Durchlaessige Belaege sind trotzdem befestigte Flaechen und erfordern einen
geeigneten Unterbau. Statik (Schnee- und Windlast), Punktfundamente, Entwaesserung,
Bordsteinabsenkung, Sichtfelder und die zulaessige Grenzbebauung sind fachlich
und baurechtlich zu pruefen. Die Masse sind Entwurfsvorgaben, kein
Genehmigungs- oder Stellplatzsatzungsnachweis.

| Ebene | Verteilung | Lichte Modellflaechen, gerundet |
| --- | --- | --- |
| EG | Rechteckiges Dusch-WC, Diele inkl. offener Schwelle, offener Wohn-/Koch-/Essbereich | 3,1 / 8,8 / 39,4 m2 |
| OG | Bad mit Duschnische, Kind Nordost, Kind Sued, Abstellkammer, 1,05-m-Flur | 9,9 / 15,4 / 18,0 / 2,3 / 3,6 m2 |
| DG | Eltern/Ankleide, Gaeste/Arbeit, Flur inkl. Nische | Bodenflaechen 19,5 / 14,4 / 2,5 m2; hoehengewichtet 16,4 / 11,6 / 2,5 m2 |
| KG | Technik, Waschen/Lager, Kinderpartyraum, Flur inkl. Nische | Nutzflaechen 11,9 / 10,0 / 24,9 / 3,3 m2 |

Im Ost-Carport steht ein grob modellierter grauer Seat Leon ST, mittig auf der
markierten Stellflaeche und vorwaerts eingeparkt: Front zur Rueckwand, Heck zur suedlichen Einfahrt.
Abmessungen aus der bereitgestellten Zeichnung:
4,642 m Laenge, 1,799 m Karosseriebreite ohne Spiegel, 1,991 m mit Spiegeln,
1,448 m Hoehe und 2,686 m Radstand. Form und Farbe orientieren sich schematisch
am Fahrzeugfoto; Foto und Masszeichnung zeigen unterschiedliche Modellgenerationen.
Zwischen Spiegeln und Lamellenwand bleiben rund 57 cm, zwischen Karosserie und
Lamellen rund 67 cm; das ist kein Nachweis fuer voll geoeffnete Tueren. Ein Klick oder Antippen des Autos
laesst es gerade rueckwaerts auf die suedliche Fahrbahn rollen; erneutes Anklicken
faehrt es vorwaerts auf denselben Carportplatz zurueck. Waehrend der Fahrt kann
die Richtung erneut umgekehrt werden. Raeder und Schatten bewegen sich mit.
Die Aussenansicht zoomt bei Bedarf etwas heraus, damit der Wagen anklickbar bleibt.
Bei reduzierter Bewegung wird direkt zwischen den Positionen gewechselt.
Die Parkposition gilt fuer die aktuelle 3D-Szene und wird beim Neuaufbau zurueckgesetzt.
Reine Anschauungsanimation ohne Verkehrsmodell, Fahrzeugkollision oder bewegliche
Tueren; das Auto steht draussen quer zur Fahrbahn, keine Schleppkurvenpruefung.

Die kompakte U-Wendeltreppe orientiert sich an der annahernd quadratischen
Herstellerreferenz: Kern 2,10 x 2,20 m bei x=0,40..2,50 und z=3,10..5,30 m.
Sie wurde gegenueber der mittigen Testposition genau 80 cm nach Norden verschoben.
An- und Austritt zeigen nach Osten. 16 Steigungen, nominell 90 cm Laufbreite,
acht direkt aufeinanderfolgende Wendelstufen, kein gerader Mittellauf.
Die Zwischenwaende und Einbauschraenke der bisherigen Nische sind entfernt.
Auch die Bodenfuellung entfaellt oberhalb des Kellers: offenes Treppenauge,
4,62 m2 Deckenaussparung, mit 1 m hohem Gelaender am Flurrand.
Keine gepruefte Hersteller- oder Ausfuehrungsgeometrie. Huellrechteck-Ersparnis
ist kein Wohnflaechengewinn; Wandflaechen werden nicht als Raumflaeche gezaehlt.
Aussenhuelle 7 x 10 m und Wandstaerken bleiben unveraendert. Der Verteiler ist
95 cm licht breit; im OG reicht er bis z=6,96 m zu Suedzimmer und offener Leseecke.
Prioritaeten: ausgeglichene Kinderzimmer, offene Leseecke, kompaktes Bad,
Familienwohnen mit Bestandsmoebeln sowie Eltern/Ankleide und Gaeste/Arbeit.
Im EG liegt die 90-x-90-cm-Dusche jetzt im Suedwesten direkt an Haustrennwand
und Treppenwand: x=0,40..1,30,z=2,04..2,94 m. Die Duschbucht ist nur 90 cm
breit. Das Dusch-WC hat 3,996 m2, seinen Eingang im Norden an der Dielenseite
und WC sowie Waschbecken an der Nordwand. 90-cm-Tuer nach innen oeffnend.
Rechts neben der Dusche liegt eine offene Vorratsnische: x=1,46..2,66,
z=1,95..2,94 m, 120 x 99 cm bzw. 1,188 m2. Regal 25 cm tief an der Westwand,
92,5 cm freie Flaeche bis zur oestlichen Oeffnung. Zugang von der Kueche;
keine abgeschlossene oder separat belueftete Speisekammer. Der bisherige separate
Vorratshochschrank bleibt entfallen. Garderobe jetzt
176 x 56 x 240 cm in der 180 x 60 cm Eingangsnische, Front nach Norden zur Diele.
Die alte Nordwandgarderobe entfaellt, die Sitzbank bleibt. Raum-, Moebel- und Schwenkflaechen geometrisch sowie Zugaenge
in der Simulation geprueft, kein Barrierefreiheits- oder Sanitaernachweis.
Westliche Dielenwand bleibt bei z=1,79 m.
Oestliche 180 cm der Wand jetzt 60 cm suedlicher bei z=2,39 m,
Kuechenseite z=2,55 m. Ruecksprungwand 16 cm bei x=4,66..4,82 m.
Haustuer weiterhin um 35 statt etwa 20 cm
nach Norden auf z=0,75..1,75 m, damit sie nicht mit der Kuechenwand kollidiert.
Seitenlicht jetzt z=0,39..0,74 m, Vordach ab z=0. Anschluesse, schmale Pfeiler
und Tragwerk ungeprueft. Nur EG geaendert; Treppe und obere Geschosse unveraendert.
Wohnen/Kochen/Essen hat 38,4068 m2; Diele einschliesslich Schwelle 6,8716 m2.
Gegenueber der verworfenen 120-cm-Nische: Diele +0,36 m2, Wohnen -0,552 m2,
davon 0,192 m2 fuer die neue kurze Hochschrank-Rueckwand.
Der vollbreite Wohnbereich beginnt bei z=5,46 m. Das Regal folgt der Treppenwand;
Sofa und Couchtisch sind suedlich versetzt, Sideboard und TV unveraendert.
Der Keller hat drei Nutzraeume: Technik ueber die ganze Nordbreite (15,9 m2),
Waschen/Lager als Rechteck oestlich der Treppe (6,3 m2) und einen Hobbyraum ueber die ganze
suedliche Hausbreite. Als Kinderpartyraum eingerichtet: freie Tanzflaeche,
Sitzbank, niedriger Snacktisch und kleines Spielzeugregal am Rand. Diskokugel
mit 36 cm Durchmesser, Unterkante 1,95 m, drei dauerhaft leuchtende Farben
und langsam wandernde Lichtpunkte; kein Blitzen oder Stroboskop.
Reduzierte-Bewegung-Systemeinstellung stoppt die Animation. Moeblierung
schaltet auch die Partyausstattung. Deckenbefestigung, Elektroinstallation,
Lueftung und zulaessige Kellernutzung sind noch fachlich zu pruefen.
Kein separater Abstellraum.

Der Installationsschacht ist in allen vier Geschossen vollstaendig aus der
Planung entfernt, einschliesslich seiner Flaechenabzuege. Leitungsfuehrung und
erforderliche Installationsflaechen sind spaeter neu zu planen.
Das OG-Bad hat 9,9136 m2: Hauptbereich 3,31 x 2,56 m plus
120 x 120 cm bodengleiche Duschnische oben rechts. Hauptbreite fuer die
90-cm-Tuer nach Norden vom Flur beibehalten. Wanne 180 x 80 cm,
WC und 100-cm-Waschplatz. Gefaelle, Abdichtung und Leitungen ungeprueft.
Die Lesenische entfaellt. Direkt suedlich der unveraenderten Treppe liegt
eine querliegende Abstellkammer: 2,10 x 1,10 m licht, 2,31 m2,
90-cm-Tuer nach innen, 30 cm tiefes Stirnregal. Lueftung ungeprueft.
Kind Nordost 15,363 m2 mit 2,75 x 4,82 m Hauptflaeche und Nordfensternische.
Kind Sued 18,038 m2 als durchgehendes Rechteck 6,22 x 2,90 m.
Unterschied rund 2,7 m2; eine volle 3-x-4-m-Flaeche wird noch nicht erreicht.
Beide haben 90-x-200-cm-Bett, 140-x-60-cm-Schreibtisch und 160-cm-Schrank,
eigenen Flurzugang und je zwei Fenster (Nord/Ost beziehungsweise Sued/Ost).
Der Verteiler hat 3,633 m2. Keine Einbauschraenke oder Zwischenwaende im
Treppenauge; dessen offene Flaeche ist nicht Teil der Raumflaechen.
Beide EG-Treppenzugaenge sind 90 cm breit und deckenhoch offen,
ohne Tueren, Tuerkollisionen oder Sturz im Modell.
Abstand zur ersten Stufe, Podestbedarf, Kopffreiheit und Brandschutz der
offenen Geschossverbindung sind fachlich zu pruefen.

Im DG liegt die Wandmitte der Ost-West-Zimmertrennung auf der Firstlinie z=5 m.
Beide Raeume gehen unabhaengig vom Verteiler (2,09 m2) ab.
Er beginnt bei z=3,10 m. Der ehemalige noerdliche Flurbereich gehoert
zum Gaestezimmer; die ungenutzte obere Treppenantrittsseite ist geschlossen.
Der letzte Treppenaustritt bleibt frei zugaenglich, das Treppenauge offen.
Eltern/Ankleide: 19,7448 m2 Bodenflaeche, 16,6892 m2 hoehengewichtet.
Das Bett (180 x 200 cm) hat das Kopfteil zur Firstwand; westlich nur 43 cm,
oestlich 62 cm Platz. Der westliche Bettzugang ist in dieser Testvariante
eingeschraenkt. Am Fussende sinkt die Dachhoehe zum Rand des 60-cm-Streifens
auf etwa 1,82 m, in dessen Mitte liegt sie knapp ueber 2 m. Ankleide im Suedwesten.
Elterntuer bei z=5,30 m, nach Norden in den Verteiler oeffnend.
Gaeste/Arbeit: 14,3528 m2 Bodenflaeche, 11,2972 m2 hoehengewichtet.
140-x-200-cm-Gaesteschlafsofa im ausgezogenen Zustand, 60 cm Seiten- und
Fusszugang; 140-cm-Schreibtisch an der Firstwand, niedriger Stauraum im Nordwesten.
Kein Ausklappmechanismus simuliert. Zwei gleich grosse Ostgiebelfenster bleiben.
Nord- und Suedtraufstreifen unter 1,20 m sind mit 16 cm starken Waenden
geschlossen, ohne Tueren oder separat waehlbare Raeume. Raumseitige Wandkanten
bei z=1,525 m und z=8,475 m, lichte Hoehe dort etwa 1,31 m. Die 1,20-m-Linie
liegt jeweils auf der abgesperrten Wandseite. Abgetrennte Streifen und neue
Wandflaechen sind aus Grund- und Wohnflaechen entfernt. Dachfenster, Anschluesse,
Belichtung und Aufenthaltsraum-Eignung muessen fachlich geprueft werden.

EG: 1,30 m breiter, deckenhoher Durchgang (2,65 m) statt Dielentuer,
ohne Sturz im Modell; Tragwerk fachlich zu klaeren. Fliesen in Diele und Baedern,
Eichenparkett auch in den Fluren von KG/OG/DG. L-Sofa zum TV an der
Suedwand. Bestandssofa 250 cm lang, normale Tiefe 80 cm, Gesamttiefe an der
Recamiere 170 cm. Essbank an der Ostwand, drei Stuehle nur gegenueber.
Eiche-Sideboard 180 cm lang, 45 cm tief, 60 cm hoch; weisses Buecherregal mit
Schubladen 212 cm lang, 40 cm tief, 212 cm hoch, vor der geschlossenen Suedwand
der Treppe. Haustuer nach innen oeffnend, auch in der gespiegelten Westhaelfte.
Tuerhohes Seitenlicht am Eingang: 35 x 210 cm Festverglasung.
L-Vordach in Holz mit 120 cm Ausladung, 220 cm Laenge und Unterkante 235 cm;
16 cm Dachstaerke und 12 cm noerdliche Seitenwange. Konstruktion ungeprueft.

Kueche: zwei parallele Nord-Sued-Zeilen, nach Sueden offen.
Mittlere Zeile: Kuehlschrank und Backofenschrank je 60 x 60 x 255 cm,
x=4,12..4,72, z=2,55..3,75 m; Fronten nach Osten zum Arbeitsgang.
Dahinter nur 120 cm lange, deckenhohe Rueckwand bei x=3,96..4,12 m.
Suedlich davon niedrige Kochhalbinsel 180 x 86 cm ab x=3,96,z=3,75 m,
ohne hohe Rueckwand. Zwei 90-cm-Auszugsmodule, 60 cm tief, Front nach Osten;
zwei rueckseitige Faecher 90 cm breit und nur 20 cm tief, Front nach Westen.
80-cm-Kochfeld laengs zur Zeile bei x=4,22,z=3,83 m, 92 cm freie Arbeitslaenge
am Suedende. Nur 8 cm zum Hochschrank: erforderliche Herstellerabstaende,
Waermeschutz, Ausschnitt und Platzbedarf der Muldenlueftung ungeprueft.
Ostzeile 300 x 60 cm bei x=6,02,z=2,55 m: 60 cm Kaffeeplatz,
60 cm Geschirrspueler, 80 cm Spuelenschrank, 90 cm Auszug/Arbeitsplatz
und 10 cm Einbauzugabe. Siebtraeger nach Westen zum Arbeitsgang gedreht.
Fensterposition und Spuele unveraendert; Wasser/Elektro ungeplant.
Arbeitsgang 120 cm, vor Hochschraenken 130 cm. Westlicher Durchgang
zwischen Treppe und Mittelzeile weiterhin 130 cm. Kuechenzugang nur von
Sueden: direkte Verbindung Eingang-Wohnen bleibt frei, zum Kuehlschrank
entsteht ein laengerer Weg. Keine verbindende Querzeile am Suedende.
Zum Esstisch 145 cm; bei angenommenen zusaetzlichen 60 cm Sitzbedarf
an der Nordkante bleiben 85 cm. Bank und drei Weststuehle bleiben erhalten.
Arbeitsplatten gesamt 3,348 m2 statt 4,16 m2 der verworfenen Quer-Kueche.
Kein Flaechen- oder Nettostauraumgewinn behauptet; bessere Wegeaufteilung
und breitere Garderobe sind die Prioritaet. Innenmasse herstellerabhaengig.
`kitchenStorage.ts` teilt nutzbare Module fuer Plan, Messwerkzeug und 3D.
Tests pruefen Modulgrenzen, 60-cm-Oeffnungsflaechen ohne feste Hindernisse,
Geraeteauswahl und beidseitige Rapier-Laufwege. Schrankfronten/Geschirrspueler
sind nicht animiert oder separat kollidierend. Ein 60-cm-Auszug laesst
im 120-cm-Arbeitsgang nur 60 cm Restbreite. Gegenueberliegende geoeffnete
Auszuege und stehende Personen koennen den Gang blockieren;
gleichzeitige Bedienung ist nicht als konfliktfrei nachgewiesen.
Moebelfronten, Eckblenden, Geraeteeinbau, Wasser/Elektro und Lueftung bleiben
Entwurfsannahmen und muessen mit dem Kuechenhersteller geprueft werden.

- Aussenhuelle: 7,00 m Ost-West x 10,00 m Nord-Sued. 70 m2 je Ebene sind NICHT
  die Wohnflaeche oder die Gesamt-BGF des Hauses.
- Aussenwaende 38 cm, westlicher Trennwand-Platzbedarf 40 cm, Innenwaende 16 cm.
  Wandstaerke allein garantiert keinen Schallschutz; Aufbau, Anschluesse und
  tragende Innenwaende sind noch nicht festgelegt oder bemessen.
- EG/OG: 2,65 m lichte Hoehe, 35 cm Decken-/Fussbodenpaket, 3,00 m Geschosshoehe.
  KG: 2,40 m lichte Hoehe und 2,74 m Geschosshoehe, Kellerdecke gesamt 34 cm.
- Haupttreppe: durchgehende U-Wendelung ohne Podest oder geraden Mittellauf.
  16 Steigungen je Ebene: vier Nordstufen, acht Wendelstufen,
  drei Suedstufen und der Geschossaustritt.
  Gerade Auftritte 25 cm, letzte Trittplatte 50 cm;
  angenommene Wendel-Lauflinie rund 25,5 cm.
  Steigung EG/OG 18,75 cm, KG 17,125 cm; regulaeres Schrittmass ca. 59,3..63,0 cm.
  Nominell 90 cm Laufbreite, durch Gelaender und Handlaeufe reduziert.
  Kern 2,10 m Ost-West x 2,20 m Nord-Sued, x=0,40..2,50,z=3,10..5,30.
  Huellrechteck und Deckenaussparung 4,62 m2, keine Bodenfuellung im Auge.
  Antritt Nordost bei z=3,55 m, Austritt Suedost bei z=4,85 m.
  Lichte Flurbreite 95 cm. Beide Enden liegen auf derselben Seite.
  OG-Tuerverteiler reicht bis z=6,96 m; kein zusaetzlicher Querflur.
  Die berechnete DG-Dachhoehe liegt ueber der Treppe ueber 2 m.
  Das ersetzt keinen Kopffreiheitsnachweis zwischen Stufen und Geschossdecken.
  Radiale Innenkanten nur etwa 7,8 cm: fachgerechte Stufenverziehung und
  gleichmaessige Auftritte sind noch zu planen. Handlaeufe bisher segmentiert.
  Nutzbare Laufbreite, Kopffreiheit, Treppennorm, Tragwerk und Brandschutz
  sind nicht nachgewiesen. Die Simulation ist keine Ausfuehrungsvorlage.
  Alle vier Geschosse verwenden ausschliesslich den Hauptentwurf. 2D, Stufen,
  Gelaender, Deckenloecher und Kollisionen verwenden dieselbe Geometrie.
- Beide Hausdaecher zeigen leicht erhoehte Ziegelreihen im 32-cm-Raster entlang
  der Dachneigung, entsprechend der schematischen Nachbardarstellung. Die Reihen
  sind 12 mm hoch und folgen als dunklere Abstufung der jeweils gewaehlten
  Dachfarbe, getrennt fuer Ost und West. Dachfenster bleiben ausgespart.
  Nur eine Oberflaechenstudie, keine konkrete Ziegel- oder Deckungsspezifikation.
- Beide Haushaelften erhalten je eine Dachrinne an der Nord- und Suedtraufe.
  Je Traufe sitzt ein trennwandnahes Fallrohr auf der inneren Seite; zusammen
  sind das vier sichtbare Fallrohre fuer das Doppelhaus, die bis zum Gelaende
  reichen. Unterirdische Leitungen, Gefaelle, Kanal- oder Zisternenanschluss
  sowie hydraulische Bemessung sind nicht modelliert und fachlich zu planen.
- Satteldach: 35 Grad, First Ost-West. 50 cm Kniestock wird hier als LICHTE Hoehe
  ueber Fertigfussboden am inneren Dachansatz interpretiert. Das ist eine Annahme,
  nicht die nachgewiesene baurechtliche Kniestockdefinition. Dachpaket 35 cm normal
  zur Dachflaeche. Zwei Dachfenster je Haelfte, beide 114 x 140 cm:
  Nord bei x=2,93 / z=1,55 m, Sued bei x=2,93 / z=6,60 m.
  Fenstermitten bei x=3,50 m in der Mitte der DHH. Das Treppenfenster ist entfernt,
  einschliesslich Dachoeffnung und Kollision. Brandschutzabstaende ungeprueft.
  Gaengige Nennformate in der Dachflaeche; Projektionstiefe ist Laenge mal cos(35 Grad).
  Zwei gleiche Ostgiebelfenster, je 98 x 118 cm, Bruestung 90 cm, bei z=3,00
  und 5,50 m. Beide Zimmer haben Licht von Dach- und Giebelseite.
  Dachpaneele und Kollision lassen beide Oeffnungen frei. Einbau-/Rohbaumasse
  und Produktverfuegbarkeit beim gewaehlten Hersteller bestaetigen; kein Tageslichtnachweis.
  Belichtung, Einbau und erforderlicher Abstand zur Haustrennwand ungeprueft.
- Westliche Trennwand ohne Oeffnungen. Westhaelfte vollstaendig bei x=0 gespiegelt,
  1,20 m nach Sueden versetzt: KG/EG/OG/DG, Moebel, Stufen, Fenster, Tueren,
  Dachfenster, Terrasse, Vordach und Lichtschaechte. Kollisionen und bewegliche
  Oeffnungen sind ebenfalls gespiegelt; Hausanschluss und Wanddoppelung ungeprueft.
- Suedterrasse 5 x 3 m plus 0,75 x 1,50 m Eckstueck, separat ausgewiesen. Die 3 m breite Verglasung besteht aus
  1,5 m beweglichem und 1,5 m festem Teil. Der bewegliche Fluegel wird seitlich
  vor das feste Feld geschoben; Hub 12 mm illustrativ, kein Beschlagdetail.
  Terrasse mit 14,4 cm breiten Holzdielen im 15-cm-Raster, Fugen 6 mm;
  Laengen und Randbretter folgen Hauptflaeche und Eckstueck.

## Gelaende, Sonne und Fassaden

### Abstandsflächen im Außenanlagenplan

Bei Auswahl von Haus Ost oder Haus West erscheint dessen Abstandsflächenprofil.
Die gemeinsame Wand ist gestrichelt, die Flächen sind türkis; rote Schraffur
zeigt Anteile außerhalb der jeweiligen **geplanten Grundstückshälfte**, einschließlich
der angenommenen Teilung bei x=0. Andere Objektauswahl blendet die Flächen aus.
Bemaßung schaltet nur die Tiefenmaße; der SVG-Export enthält Flächen und Annahmen.
Profilpunkte sind auch Fangpunkte des Maßbands.

`src/setbacks.ts` berechnet aus den aktuellen Hausmaßen, DG-Fußbodenhöhe,
Kniestock, Wand- und Dachstärke, Neigung, Firstreserve, Gelände und Nachbarversatz:
- Traufen: max(3 m, 0,4 × (Wandhöhe ab Gelände + Dachhöhe/3)) bei bis zu 70°;
  darüber volle Dachhöhe. Der Firstabschluss ist im Dachhöhenansatz enthalten.
- Giebel: max(3 m, 0,4 × örtliche Wandhöhe bis zur Dachhaut). Das Giebeldreieck
  zählt voll, nicht pauschal zu einem Drittel. Die Firstreserve wird vorsorglich
  entlang des gesamten Giebelprofils addiert. Profilknicke bei der 3-m-Untergrenze
  werden exakt berechnet, nicht durch grobe Stützstellen angenähert.
- Gemeinsame Wand nur im tatsächlichen Kontaktbereich beider gleich großen,
  versetzten Haushälften ausgenommen, **unter Annahme zulässiger Grenzbebauung**.
  Freie Versatzstücke bleiben vorsorglich dargestellt; auch dort kann die rechtliche
  Behandlung anders ausfallen und muss geklärt werden.

Aktuell rund 3,221 m an den Traufen und 3,00 bis 4,173 m am äußeren Giebel.
Die Flächen folgen den Wandnormalen, nicht der schrägen Grundstücksgrenze;
an Gebäudeecken werden keine kreisförmigen Abstandspuffer ergänzt.
Änderungen der zentralen Modellparameter aktualisieren die Berechnung nach Neuladen;
keine fest eingetragenen heutigen Grenzabstandswerte. Keine Höhen-/Maßbearbeitung im UI.

Grundregel nach [Art. 6 Abs. 1–6 BayBO](https://www.gesetze-bayern.de/Content/Document/BayBO-6),
Fassung ab 01.05.2026, geprüft am 15.09.2026. Nicht die Sonderregel für Gemeinden
mit mehr als 250.000 Einwohnern. Örtliche Satzungen/Bebauungsplan bleiben ungeprüft.
Ebene Geländeannahme, kein vermessenes Urgelände oder amtlicher Teilungsplan.
Keine Prüfung zulässiger Überdeckungen, privilegierter Garagen, Nachbargebäude,
Vorbauten, Dachaufbauten oder rechtlich gesicherter Flächen auf Nachbargrundstücken.
Rot ist eine geometrische Warnung, keine Feststellung der Unzulässigkeit;
türkis ist umgekehrt keine Freigabe. Kein Genehmigungs- oder Abstandsflächennachweis.

Das gemeinsame Grundstueck und sein Umfeld sind schematisch rekonstruiert.
Grenzverlaeufe, Nordrichtung und Hausachsen bleiben als Entwurfsannahmen erhalten;
eine amtliche Georeferenzierung oder Vermessung liegt nicht vor.

Die mittige Teilung, Hauspositionen und Nachbarschaft bleiben schematische
Entwurfsannahmen. Der kleinste senkrechte Hauskoerperabstand bleibt mindestens
3 m; die 3-m-Vorgabe stammt vom Nutzer.
kein vermessener Lageplan oder Nachweis aller Vorschriften des Bebauungsplans.
Dachueberstaende, Vordach, Grenzwanddetails und rechtliche Abstandsdefinitionen
sind von diesem geometrischen Hauskoerpernachweis nicht abgedeckt.
Gelaende liegt vorlaeufig 20 cm unter EG-Fertigboden. Wege, Terrassen und
Lichtschachtroste behalten gesonderte Anschlusshoehen; Nachbargelaende ist
nicht vermessen. Drei kleine Kellerfenster
mit Lichtschacht, Rost und sichtbarer Tiefe ersetzen die frueheren Vollformatfenster.
Abdeckungen/Lichtschacht-Aussenmasse jetzt 100 x 50 cm, Innenmasse kleiner.
Abdichtung, Entwaesserung, Ueberflutungsschutz und realer Gelaendeverlauf sind offen.

SunCalc 2 berechnet den Sonnenstand fuer ca. 49,593 N / 11,052 O an 20. Maerz,
21. Juni und 21. Dezember 2026 mit MEZ/MESZ. Sonnenwinkel werden fuer Three.js
explizit von Grad/Nordazimut in Radiant/Suedazimut umgerechnet. Keine reale
Umgebungserfassung, kein Horizontmodell und kein normativer Besonnungsnachweis;
Innenbeleuchtung und Materialwirkung sind illustrativ.

Glas wirft keinen undurchsichtigen Schatten mehr; Rahmen und Laibungen bleiben
Schattenwerfer. Direkte Sonne gelangt auch durch geschlossene Verglasungen.
Keine spektrale Transmission, Lichtbrechung, Kaustik oder indirekte Tageslichtsimulation.
Statische Orbitbilder werden nur bei Aenderung neu gezeichnet; Schattenkarten
bei Sonnen-/Oeffnungs-/Szenenaenderungen. Der Rundgang rendert kontinuierlich.

Die abschaltbare Nachbarschaft folgt einer schematischen Lagebasis; Farben und
Hoehen der suedlichen Reihe sind anhand der zusaetzlichen
Vogelperspektive angenaehert. Bestehende Modellachsen bleiben erhalten.
Strassen, Nachbargrenzen und Hausumrisse verwenden dieselbe Lagebasis in 2D/3D.
Nachbarhoehen und Positionen sind keine belastbare Verschattungsgrundlage;
siehe Umfeldbeschreibung oben.
Garten: vier Baeume, Randpflanzung, Zaun mit seitlichen Zugangsluecken und eine
45 cm breite, 1,45 m hohe Trennhecke von Nord nach Sued, ausgenommen die Haeuser.
Zaun, Hecke, Wege und Hintergrund sind ohne physikalische Kollisionskoerper;
Grenzabstaende, Entwaesserung und tatsaechliche Zugaenge bleiben ungeprueft.

Fassadenkompositionen: Putz durchgehend, Holz ab EG, Holz OG/DG, Holz nur OG
ohne DG, OG plus Eingang, Ostgiebel, Eingang oder vertikale Holzfelder.
Profile: vertikale 14-cm-Bretter, schmale Lamellen im 6-cm-Raster oder offene
Lamellenfelder auf Putz im 16-cm-Raster (45 Prozent Holzanteil). Lokal generierte
Holztextur und acht Toene. Die Profile sind Shaderdarstellungen ohne echte
Lamellentiefe oder eigene Fugenschatten. Vordach und Seitenwange folgen dem Holzton.
Fenster und Tueren bleiben ausgespart, Innenwaende und Deckenunterseiten weiss.
Die Bekleidung laeuft ueber aeussere Wandkanten und die aeussere Haelfte der
Laibungen bis zur mittig angenommenen Fensterebene. Die innere Laibung bleibt weiss.
Die Zuordnung basiert auf Weltkoordinaten statt nur der Flaechennormale; auch
Giebelseiten und Eckrueckspruenge behalten deshalb den gewaehlten Fassadenentwurf.
Bekleidung ist nur Materialdarstellung: keine zusaetzliche Wanddicke,
Unterkonstruktion, Hinterlueftung, Brandschutz- oder Anschlussplanung.

## Grenzen

**Kein genehmigungsfaehiger Bauplan, keine Ausfuehrungsplanung, keine Statik.**
Grundlage sind die Angaben der Bauherren, nicht ein vermessener Lageplan oder
gepruefter Bebauungsplan. Baugrenzen, Abstands-/Grundstuecksflaechen, Versatz,
Nachbaranschluss, Erschliessung, Trauf-/Firsthoehen, Vollgeschoss-Einstufung,
Brand-/Schallschutz, Rettungswege, Belichtung, Lichtschaechte und Abdichtung
muessen fachplanerisch geprueft werden. KG-Fenster und Technik sind schematisch.

Flaechen werden aus disjunkten lichten Raumrechtecken berechnet. Ein Schacht ist
vorerst weder vorgesehen noch abgezogen; Einbaumoebel werden mitgerechnet. Tuerschwellen und Treppenloch sind
nicht als Raumflaeche enthalten. EG/OG/DG-Flure enthalten die gemeinsame freie
Erschliessung vor der Treppe. Unter 1 m Dachhoehe erfolgt keine, zwischen 1 und 2 m
halbe und ab 2 m volle Anrechnung. Keller und Terrasse sind nicht in der
Wohnflaechensumme enthalten. Die Auswertung orientiert sich an
[WoFlV §3](https://www.gesetze-im-internet.de/woflv/__3.html) und
[WoFlV §4](https://www.gesetze-im-internet.de/woflv/__4.html), ist aber kein
vollstaendiger oder amtlicher Wohnflaechennachweis.

Der Rundgang ist eine Massstabsvisualisierung, kein Nachweis von Barrierefreiheit
oder DIN-Konformitaet. Kollisionskoerper von Moebeln sind vereinfachte Huellen;
Innentuerfluegel sind zwischen 0 und 90 Grad einstellbar, Dachfenster zwischen
0 und 36 Grad, der Terrassenfluegel zwischen geschlossen und 1,50 m verschoben.
Werte werden direkt gesetzt, nicht zeitlich animiert. Die Haustechnik hat
keine Leistungsberechnung. Keine Toilette im DG, keine Gauben, kein Dachbad.

## Entwicklung und Pruefung

```sh
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

- `src/model.ts`: gemeinsame Quelle fuer Masse, Geschosse, Raumflaechen,
  Oeffnungen, Moebel, Dachhoehen und Treppen des Hauptentwurfs.
- `src/FloorPlan.tsx`: technische SVG-Darstellung und Auswahl.
- `src/measure.ts`: Objektmasse, Fangpunkte und Messrechnung.
- `src/SectionView.tsx` / `src/section.ts`: echte Modellquerschnitte und Schnittmassband.
- `src/scene.ts`: Three.js-Geometrie, aus denselben Daten abgeleitete Kollisionen,
  lokal erzeugte Eichen-Bitmaptextur und masshaltige Moebel.
- `src/walk.ts`: Rapier Character Controller, fester 60-Hz-Schritt, Treppen und Tueren.
- `src/HouseScene.tsx`: GPU-Lebenszyklus, Orbit-, Maus- und Touchsteuerung.
- `src/context.ts`: Sonnenstand, schematisches Grundstueck und Materialauswahl.
- `src/surroundings.ts`: abschaltbare Nachbarschaft, Zaun und Garten.
- `tests/double-house.spec.ts`: Mausrad, Spiegelung, West-Rundgang, getrennte
  Hausfarben, Umgebungsschalter und GPU-Schattenvergleich fuer Glas.
- `src/facade.ts`: Weltkoordinaten-basierte Fassadenbekleidung nur auf Aussenflaechen.
- `src/model.test.ts`: Raumziele, Innenflaechen, Dach, Treppenschnitt und DG-Moebel.
- `src/geometry.ts`: getrennte Flaechennormalen fuer ebene Giebel und Dachkeile.
- `tests/main-design.spec.ts`: volle/geschnittene Wandhoehen, plane Giebel, L-Vordach.
- `tests/house.spec.ts`: Desktop/Mobil, Screenshots und Canvas-Pixel,
  SVG-Export, Tastatur/Touch, Wandkollision, Tueren und Treppenbewegung.
- `tests/revision.spec.ts`: Hauptentwurf, neue Zugaenge, alle Osttreppen auf/ab,
  weisse Decken, Dachfensterlage, Sonnenbewegung und offene Tuerdurchgaenge.
- `tests/facade.spec.ts`: acht Fassadenkompositionen, Holztoene und Lamellen auf Desktop/Mobil,
  Screenshots, Pixelvergleich, Shaderfehler und stabile Kameraposition;
  GPU-Proben fuer innere/aeussere Laibungen, Eckkanten und Giebelrueckspruenge.
- `tests/tools.spec.ts`: Hover-Masse, Massband unter Zoom, Schnittmassband, beide
  Schnittachsen, Teiloeffnungen, nach innen drehende Fenster und Treppenhaus-Dachfenster.

Screenshots und Fehlertraces liegen nach dem Lauf in `test-results/`. Browsertests
verwenden Chromium; Safari/WebKit und Firefox sind nicht Bestandteil dieser Abnahme.
Das nur im Entwicklungsmodus vorhandene `window.__house` erlaubt deterministische
Einstiegspunkte und Positionspruefungen. Im Produktionsbuild ist es nicht vorhanden.

## Bibliotheken und Assets

React (MIT), Vite (MIT), Three.js (MIT), Rapier (Apache-2.0), Lucide (ISC), SunCalc (BSD-2-Clause).
IBM Plex Sans wird lokal ueber Fontsource eingebunden (SIL Open Font License 1.1).
Die jeweiligen Lizenztexte befinden sich in den installierten Paketen.
Alle Moebelgeometrien und die generierte Holztextur wurden fuer diesen Entwurf
erstellt; es werden keine fremden Modell-/Bilddownloads oder CDN-Hotlinks verwendet.
