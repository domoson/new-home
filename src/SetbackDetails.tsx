import { metres } from './measure'
import { currentSetbackParameters, houseSetbacks } from './setbacks'

export default function SetbackDetails({ side }: { side: 'east' | 'west' }) {
  const result = houseSetbacks(side)
  return <section className="room-detail setback-details" aria-label="Abstandsflächenberechnung">
    <div className="eyebrow">ART. 6 BAYBO · MODELLANNAHME</div>
    <h3>Abstandsflächen {side === 'east' ? 'Ost' : 'West'}</h3>
    <p>0,4 H, mindestens 3,00 m. Senkrecht zur jeweiligen Außenwand.</p>
    <dl>{result.faces.map(face => <div key={face.id}><dt>{face.name}</dt><dd>{metres(face.minimum)}{face.maximum - face.minimum > .001 ? ` bis ${metres(face.maximum)}` : ''}</dd></div>)}</dl>
    <p><span className="setback-key" />Berechnete Fläche<br /><span className="setback-key outside" />Außerhalb der geplanten Grundstückshälfte</p>
    <p>Traufe: Wandhöhe plus anteilige Dachhöhe (bis 70° ein Drittel, darüber voll). Giebel: volle örtliche Wandhöhe bis zur Dachhaut; keine pauschale Drittelung des Giebels. Zusätzlich {metres(currentSetbackParameters().ridgeAllowance)} Firstreserve entlang des Giebelprofils.</p>
    <p>Gelände eben bei {metres(result.terrain)} ab FFB EG angenommen. Gestrichelte gemeinsame Wand: ohne eigene Fläche unter Annahme zulässiger Grenzbebauung. Freie Versatzstücke vorsorglich mitgerechnet; deren rechtliche Ausnahme ist offen.</p>
    <p><strong>Kein Genehmigungsnachweis.</strong> Buckenhofer Satzungen, Bebauungsplan, maßgebliches Gelände, Grundstücksteilung und Doppelhausanschluss ungeprüft. Rot bezeichnet eine geometrische Überschreitung, keine abschließende Rechtsbewertung. Überdeckungen, Nachbargebäude, Vorbauten, Dachaufbauten und Rechte auf fremden Flächen sind nicht geprüft.</p>
    <a href="https://www.gesetze-bayern.de/Content/Document/BayBO-6" target="_blank" rel="noreferrer">Art. 6 BayBO, Abs. 1–6</a>
  </section>
}