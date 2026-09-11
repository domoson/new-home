# An der Roeth 10

Lokaler, interaktiver Vorentwurf der oestlichen Doppelhaushaelfte in Buckenhof.
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

## Bedienung

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
- Szene: Tueren und oeffenbare Fenster direkt anklicken oder gezielt im Auswahlfeld
  oeffnen/schliessen. Der Regler stellt jede Oeffnung von 0 bis 100 Prozent ein.
  Fassadenfenster schwenken nach innen, Dachfenster kippen modellhaft nach innen.
  Die EG-Hebeschiebetuer hebt geringfuegig an und verschiebt sich bis 1,50 m vor das
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
- Nur ein Hauptentwurf mit einlaeufiger, zweimal viertelgewendelter Treppe. Keine Vergleichsgrundrisse oder
  gespeicherte Entwurfsauswahl. Szeneneinstellungen bleiben beim Geschosswechsel
  erhalten, werden beim Neuladen zurueckgesetzt. Kein CAD-Editor.

## Entwurf

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

Das oestliche Nachbarhaus auf Flurstueck 74/5 ist anhand der bereitgestellten
Flurstueckkarte und drei Luftbildansichten als eigenes Umgebungsmodell angelegt.
Heller zweigeschossiger Baukoerper, graues Satteldach mit Ost-West-First,
geschlossene Giebel, Dachfenster, langer Suedbalkon und westlich unmittelbar
angebaute niedrige Flachdachgarage mit suedlicher Zufahrt und Vorgarten.
Die verzerrte Fotogrammetrie ist nicht als Fassadentextur uebernommen.

Angenommene Modellmasse: Haus 9,00 x 9,50 m, Traufe 5,50 m ueber Gelaende,
Dachneigung 38 Grad; Garage 3,20 x 10,00 m, Hoehe 2,60 m. Lage und Drehung
orientieren sich an der oestlichen Grundstuecksgrenze. Fensteraufteilung,
Balkondetails, Dachaufbauten und Vegetation sind angenaehert. Ohne vermessene
Bestandsmasse ist dies kein belastbarer Abstands- oder Verschattungsnachweis.
Das bestehende Haus und die Garage auf eurem Flurstueck 74 werden nicht
modelliert: Dort bleibt ausschliesslich der geplante Doppelhausentwurf.
Weiter entfernte Nachbarhaeuser bleiben schematisch; Dachanschluesse haben
den gleichen Gelaendebezug wie die Hauskoerper und geschlossene Untersichten.

### Direkte Nachbarn Nr. 12, 50 und 52

Die drei Platzhalter auf 75/4, 74/4 und 73/4 sind durch eigenstaendige,
an der Flurstueckkarte und den bereitgestellten Luftbildansichten orientierte
Modelle ersetzt. Dachkoerper sind geschlossen; Dachfenster, Ziegelreihen,
Schornsteine, Rinnen, Fallrohre, Fassadenfenster und Terrassen sind modelliert.

| Flurstueck / Haus | Angenommener Hauskoerper | Traufe / Dach | Markante Merkmale |
| --- | --- | --- | --- |
| 75/4 / Nr. 12 | 9,20 x 9,60 m | 5,10 m / 34 Grad | Graubraunes Walmdach, oestliche Garage 4,50 x 6,20 m, Hoehe 2,60 m, dunkellaubiger Baum im rueckwaertigen Garten |
| 74/4 / Hallerstrasse 50 | 9,00 x 9,00 m | 5,25 m / 39 Grad | Rotes Satteldach, Suedbalkon, niedriger Ostanbau 9,60 x 5,50 m, Hoehe 2,75 m, fuenf Solarmodule |
| 73/4 / Hallerstrasse 52 | 8,50 x 9,20 m | 5,20 m / 36 Grad | Heller Putz, graubraunes Satteldach, westliche Zufahrt, Suedterrasse und Garten |

Nr. 12 ist an der westlichen Grenzrichtung ausgerichtet und von An der Roeth
erschlossen; Nr. 50 und 52 folgen der Hallerstrasse mit noerdlichen Zufahrten.
Die Modellgeometrie bleibt ausserhalb des eigenen Flurstuecks 74.
Nachbarparzellengrenzen sind nicht neu vermessen oder verbindlich rekonstruiert.
Alle genannten Masse, Dachformen, Fensteraufteilungen, Solarfeld- und
Gartendetails sind Bildschaetzungen, keine gesicherten Bestandsangaben.
Der geplante Doppelhausentwurf und das bereits modellierte Haus Nr. 8 bleiben
unveraendert. Die Umgebungsmodelle folgen dem Schalter Nachbarschaft.

### Parken und Garten

Je Terrasse 5,00 x 3,00 m Hauptflaeche und ein Ruecklauf von 0,75 x 1,50 m
ums aeussere Hauseck: zusammen 16,125 m2 statt zuvor 18 m2. Ost liegt die
Hauptflaeche bei x=3,25 bis 8,25 m, z=10 bis 13 m; der Ruecklauf bei
x=7,50 bis 8,25 m, z=8,50 bis 10 m. West gespiegelt mit 1,20 m Suedversatz.
Die seitlichen Lichtschaechte bleiben frei. Grundriss, Messobjekte, Aussenplan,
3D-Dielen und Moeblierung verwenden dieselben Terrassendaten.

Je Haushaelfte zwei unabhaengig von An der Roeth erreichbare Stellplaetze:
ein Holzcarport aussen im Suedosten bzw. Suedwesten und ein offener Platz
daneben zur Gartenmitte. Keine hintereinander blockierten Stellplaetze.
Carport-Aussenmass 3,25 x 6,00 m, vier 16-cm-Pfosten, lichte Breite 2,93 m;
beide Stellflaechen jeweils mindestens 2,50 x 5,00 m frei von Pfosten.
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

Schlankes Pultdach mit 5 Grad Neigung, ohne Begruenung: anthrazitgraues,
beschichtetes Stahlprofilblech auf sichtbarem Holztragwerk, seitliche
Abschlussbleche. Rund 52,5 cm Hoehenunterschied auf 6 m; niedrige Dachunterkante
hinten bei Modellhoehe 2,50 m, hohe Einfahrt vorne bei 3,025 m (Gelaende -0,14 m).
Rueckwaertige Rinne mit Fallrohr innerhalb der eigenen Grundflaeche;
kein freier Wasserablauf zum Nachbarn oder auf die Strasse vorgesehen.
Das ist ein preisbewusstes Materialkonzept, kein kalkuliertes Angebot oder
Lebensdauerversprechen. Konkretes Profil fuer 5 Grad nach Herstellervorgaben
auswaehlen; Korrosionsschutz, Befestigung, Kondensatschutz/Belueftung,
Schall bei Regen und Regenwasseranschluss sind noch auszuarbeiten.
Offene Einfahrt und Gartenseite, kurzes Lamellenfeld zur aeusseren
Nachbarseite, geschlossene Holzrueckwand.
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
Roeth10-Aussenanlagen.svg. Die 2D-Geometrie stammt aus denselben Daten wie 3D;
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
| EG | L-Dusch-WC, kleine Speis, Diele, offener Wohn-/Koch-/Essbereich | 4,7 / 1,8 / 8,5 / 40,0 m2 |
| OG | Familienbad Nordwest, zwei Kinderzimmer, Lesen/Spielen Suedost, Flur | Bad 8,0 / Kind Nord 15,4 / Kind Sued 15,4 / Lesen-Spielen 8,8 / Flur 6,3 m2 |
| DG | Eltern/Ankleide, Gaeste/Arbeit, Flur | Grundflaechen 19,8 / 16,2 / 3,6 m2; hoehengewichtet 16,5 / 12,9 / 3,6 m2 |
| KG | Technik, Waschen/Lager, Kinderpartyraum, Flur | Nutzflaechen 12,2 / 14,2 / 24,8 / 3,6 m2 |

Im Ost-Carport steht ein grob modellierter grauer Seat Leon ST, mittig und
vorwaerts eingeparkt: Front zur Rueckwand, Heck zur suedlichen Einfahrt.
Abmessungen aus der bereitgestellten Zeichnung:
4,642 m Laenge, 1,799 m Karosseriebreite ohne Spiegel, 1,991 m mit Spiegeln,
1,448 m Hoehe und 2,686 m Radstand. Form und Farbe orientieren sich schematisch
am Fahrzeugfoto; Foto und Masszeichnung zeigen unterschiedliche Modellgenerationen.
Zwischen Spiegeln und innerer Pfostenlinie bleiben mittig rund 47 cm je Seite;
das ist kein Nachweis fuer geoeffnete Tueren. Ein Klick oder Antippen des Autos
laesst es gerade rueckwaerts auf die suedliche Fahrbahn rollen; erneutes Anklicken
faehrt es vorwaerts auf denselben Carportplatz zurueck. Waehrend der Fahrt kann
die Richtung erneut umgekehrt werden. Raeder und Schatten bewegen sich mit.
Die Aussenansicht zoomt bei Bedarf etwas heraus, damit der Wagen anklickbar bleibt.
Bei reduzierter Bewegung wird direkt zwischen den Positionen gewechselt.
Die Parkposition gilt fuer die aktuelle 3D-Szene und wird beim Neuaufbau zurueckgesetzt.
Reine Anschauungsanimation ohne Verkehrsmodell, Fahrzeugkollision oder bewegliche
Tueren; das Auto steht draussen quer zur Fahrbahn, keine Schleppkurvenpruefung.

Die zweimal viertelgewendelte Treppe hat den Antritt im Norden zur Diele.
Im EG greift das Dusch-WC die Nischenidee der Referenzplaene auf: 4,659 m2,
mit 1,88 x 1,80 m Hauptbereich und einer 1,00 x 1,275 m tiefen suedlichen
Nische fuer die 90 x 90 cm Dusche. Neben der Dusche liegt die kleinere Speis:
1,63 x 1,115 m, 1,8175 m2, mit flachen Regalen und offenem 90-cm-Zugang.
Eine Tuer ist noch nicht festgelegt. Die Diele gewinnt Platz fuer 1,80 m Garderobe;
Wohnen/Kochen/Essen hat 40,0468 m2 einschliesslich Treppenzugang.
Der Keller hat nur noch drei Nutzraeume: vergroesserte Technik im Nordwesten,
Waschen/Lager im Nordosten und einen rechteckigen Hobbyraum ueber die ganze
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
Das OG-Bad bleibt im Nordwesten: 7,995 m2, 2,60 x 3,075 m, ohne Zugangsnische.
Die Tuer oeffnet nach innen; Wanne, separate Dusche, WC und Waschtisch bleiben.
Kind Nord: 15,3797 m2, breite noerdliche Kopfzone und L-Zuschnitt am Flur.
Kind Sued: 15,3775 m2 mit 4,50 x 3,175 m Hauptbereich und einer
2,18 x 0,50 m Garderobennische im Nordwesten.
Beide haben eigene Zugaenge, Bett, Schreibtisch und Schraenke. In Kind Sued
steht der Arbeitsplatz jetzt an der Suedwand, nicht mehr im Eingangslaufweg.
Nur noch ein 1,80 m breiter Kleiderschrank in der nordwestlichen Nische.
Die gemeinsame
Lese-/Spielzone ist an die Suedostfassade verlegt: ein zusammenhaengendes
Rechteck mit 2,075 x 4,235 m, 8,7876 m2, Arbeitsplatz und Sitzbank. Eigener
offener Flurzugang, Ost- und Suedfenster, kein Kinderzimmer als Durchgang.
Der Flur mit 90 cm tiefem Querzugang hat 6,2952 m2. Kind Sued hat ein verbreitertes
Suedfenster; das zweite Suedfenster liegt in der gemeinsamen Zone.
Leitungen, Bewegungsflaechen und Belichtung fachlich ungeprueft.

Der Elternbereich hat mit dem breiteren Flur 19,8170 m2 Grundflaeche, das Gaeste-/Arbeitszimmer
hat ohne Schachtabzug 16,1944 m2. Das 180 x 200 cm Elternbett steht quer mit Kopfteil
am Ostgiebel und mindestens 60 cm Durchgang am Fussende. Im Suedwesten liegt
die Ankleide mit wandnahen Schraenken; das Raumteilerregal ist entfernt.
Die Raummitte bleibt frei. Eine einzige Zimmertuer direkt suedlich am oberen
Treppenaustritt, bei z=5,80 m; der Flur hat 3,564 m2.
Die Tuer oeffnet ins Elternzimmer. Das Nordzimmer bietet jetzt ein
160 x 200 cm Doppelbett, 140-cm-Schreibtisch und Stauraum. Mindestens 60 cm
Zugang an einer Bettseite und am Fussende; der Kopfbereich liegt unter der
Dachschraege. Beide Zimmer haben je ein gleich grosses Ostgiebelfenster.
Nord- und Suedtraufstreifen unter 1,20 m sind mit 16 cm starken Waenden
geschlossen, ohne Tueren oder separat waehlbare Raeume. Raumseitige Wandkanten
bei z=1,525 m und z=8,475 m, lichte Hoehe dort etwa 1,31 m. Die 1,20-m-Linie
liegt jeweils auf der abgesperrten Wandseite. Abgetrennte Streifen und neue
Wandflaechen sind aus Grund- und Wohnflaechen entfernt. Dachfenster, Anschluesse,
Belichtung und Aufenthaltsraum-Eignung muessen fachlich geprueft werden.

EG: Offener Durchgang statt Dielentuer, Fliesen in Diele und Baedern,
Eichenparkett auch in den Fluren von KG/OG/DG. L-Sofa zum TV an der
Westwand. Bestandssofa 250 cm lang, normale Tiefe 80 cm, Gesamttiefe an der
Recamiere 170 cm. Essbank an der Ostwand, drei Stuehle nur gegenueber.
Eiche-Sideboard 180 cm lang, 45 cm tief, 60 cm hoch; weisses Buecherregal mit
Schubladen 212 cm lang, 40 cm tief, 212 cm hoch, vor der geschlossenen Suedwand
der Treppe. Haustuer nach innen oeffnend, auch in der gespiegelten Westhaelfte.
Tuerhohes Seitenlicht am Eingang: 35 x 210 cm Festverglasung.
L-Vordach in Holz mit 120 cm Ausladung, 220 cm Laenge und Unterkante 235 cm;
16 cm Dachstaerke und 12 cm noerdliche Seitenwange. Konstruktion ungeprueft.

Kueche: 270 x 100 cm Halbinsel bei z=4,55 m mit Induktionsfeld und angedeuteter
Muldenlueftung, Siebtraeger an der Suedkante ausserhalb des Fensterschwenkbereichs.
Kurze 155-cm-Ostzeile mit Spuele; 180 cm Hochschrankwand mit Backofen plus separater
Kuehlschrank, jeweils 255 cm hoch. Zwischen Hochschraenken und Halbinsel 165 cm.
Freie Arbeitsflaeche neben Spuele und Kochfeld, neue Speis noerdlich am Kern.
Moebelfronten, Geraete, Anschluesse und Lueftung bleiben eine Entwurfsannahme.

- Aussenhuelle: 7,50 m Ost-West x 10,00 m Nord-Sued. 75 m2 je Ebene sind NICHT
  die Wohnflaeche oder die Gesamt-BGF des Hauses.
- Aussenwaende 36,5 cm, westlicher Trennwand-Platzbedarf 40 cm, Innenwaende 16 cm.
  Wandstaerke allein garantiert keinen Schallschutz; Aufbau, Anschluesse und
  tragende Innenwaende sind noch nicht festgelegt oder bemessen.
- EG/OG: 2,65 m lichte Hoehe, 30 cm Decken-/Fussbodenpaket, 2,95 m Geschosshoehe.
  KG: 2,40 m lichte Hoehe und 2,70 m Geschosshoehe.
- Haupttreppe: ein durchgehender Lauf mit zwei Viertelwendelungen, ohne Podest.
  16 Steigungen je Ebene: vier gerade Nordstufen, acht Wendelstufen, drei
  Suedstufen und der Austritt auf die Geschossdecke. Auftritt gerade 27 cm,
  letzte Stufe 54 cm; auf der angenommenen Wendel-Lauflinie rund 25,5 cm.
  Nominell 90 cm Laufbreite, durch Gelaender und Handlaeufe reduziert.
  Kern 2,18 m Ost-West x 2,20 m Nord-Sued, x=0,40..2,58, z=3,60..5,80.
  Kernflaeche 4,796 statt 5,2452 m2, Ersparnis 0,4492 m2 (8,6 Prozent).
  Antritt Nordost bei z=4,05 statt 5,03 m: 98 cm naeher an der Diele.
  Austritt Suedost bei z=5,35 m; Flurbreite 1,62 statt 1,01 m.
  Kern plus unmittelbarer Flur 8,36 statt 7,14 m2, ohne Waende. Der breitere
  Verteiler kostet Zimmerflaeche; kein pauschaler Wohnflaechengewinn.
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
- Satteldach: 35 Grad, First Ost-West. 50 cm Kniestock wird hier als LICHTE Hoehe
  ueber Fertigfussboden am inneren Dachansatz interpretiert. Das ist eine Annahme,
  nicht die nachgewiesene baurechtliche Kniestockdefinition. Dachpaket 25 cm normal
  zur Dachflaeche. Kostenreduzierte Variante mit drei Dachfenstern je Haelfte:
  Gaeste/Arbeit Nord bei x=0,80 / z=1,90 m, Eltern Sued bei x=1,05 / z=6,60 m,
  jeweils 114 x 140 cm; Treppe bei x=1,40 / z=3,55 m, 78 x 118 cm.
  Gaengige Nennformate in der Dachflaeche; Projektionstiefe ist Laenge mal cos(35 Grad).
  Zwei gleiche Ostgiebelfenster, je 98 x 118 cm, Bruestung 90 cm, bei z=3,30
  und 4,95 m. Beide Zimmer haben Licht von Dach- und Giebelseite.
  Dachpaneele und Kollision lassen alle drei Oeffnungen frei. Einbau-/Rohbaumasse
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

Das gemeinsame Grundstueck ist aus den angegebenen Seitenlaengen rekonstruiert:
Nord 20,5 m, Ost 25,5 m, Sued 28,1 m, West 25,5 m. Nord-/Suedkante sind leicht
gegeneinander geneigt, Westseite deutlich schraeg. Keine Parallelitaet erzwungen.
Die Nordrichtung der Zeichnung bleibt oben, die Hausachsen bleiben unveraendert.
Vorgehen: Skizzenrichtungen NW->NO=(527,-73), NW->SW=(-110,648), auf 20,5 bzw.
25,5 m normiert; SO als oestlicher Schnittpunkt der Kreise um NO (Radius 25,5 m)
und SW (Radius 28,1 m). Innenwinkel NW/NO/SO/SW: 107,5207/89,7715/87,8161/74,8917 Grad.
Das ergibt 607,2641 m2. Vier Laengen bestimmen die Winkel nicht eindeutig;
die aus der schematischen Zeichnung abgeleiteten Winkel bleiben eine Naeherung.

Mittige Nord-Sued-Teilung ist als exakt flaechengleiche Gerade x=0 interpretiert,
entlang der Haustrennlinie: je 303,6321 m2. Schnittpunkte bei z=-3,0608 und
z=22,0999 m. Osthaus bleibt x=0..7,5/z=0..10, Westhaus x=-7,5..0/z=1,2..11,2.
Das Grundstueck ist relativ dazu platziert, sodass der kleinste senkrechte
Hauskoerperabstand mindestens 3 m betraegt: Nord/Osthaus 3,0318 m,
Nord/Westhaus 3,1914 m, West 3,0000 m, Ost 3,3226 m. Alle vier Hausecken werden
gegen die Nord-, Ost- und Westgrenze getestet. Die 3-m-Vorgabe stammt vom Nutzer;
kein vermessener Lageplan oder Nachweis aller Vorschriften des Bebauungsplans.
Dachueberstaende, Vordach, Grenzwanddetails und rechtliche Abstandsdefinitionen
sind von diesem geometrischen Hauskoerpernachweis nicht abgedeckt.
Gelaende liegt vorlaeufig 14 cm unter EG-Fertigboden. Drei kleine Kellerfenster
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

Die abschaltbare Nachbarschaft folgt der Struktur des bereitgestellten Luftbilds,
nicht dessen vermessener Geometrie: An der Roeth suedlich, Hallerstrasse/noerdliche
Haeuserreihe, seitliche Nachbarn, zurueckhaltende Baeume und entsaettigte Materialien.
Die bestehenden Modellachsen bleiben erhalten; keine Georeferenzierung oder
exakte Abbildung einzelner Nachbargebaeude. Strassen folgen jetzt den schraegen
Nord-/Suedgrenzen; seitliche Nachbarn liegen ausserhalb der neuen Grenzen und
die noerdliche Reihe ist daran ausgerichtet. Nur die eigenen vier Grenzlaengen
sind vorgegeben. Nachbarhoehen und Positionen sind keine belastbare Verschattungsgrundlage.
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
