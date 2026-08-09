// One-off content seed: adds a "💡 Ispirazioni" sub-page to each author page.
// New pages have no ydoc_state, so the editor seeds them from `content` (no CRDT conflict).
const D = require('better-sqlite3');
const db = new D(process.env.DB_PATH || '/app/data/mykhub.db');

function doc(intro, items) {
  return JSON.stringify({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: intro }] },
      {
        type: 'bulletList',
        content: items.map(([b, t]) => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: b + ': ' },
              { type: 'text', text: t },
            ],
          }],
        })),
      },
    ],
  });
}

// parentId -> { intro, items: [ [fonte, effetto], ... ] }
const data = {
  307: { intro: "Cosa spinse Verga al Verismo e alla rappresentazione del mondo dei Vinti:", items: [
    ["Naturalismo francese (Zola, Flaubert)", "il metodo impersonale e scientifico applicato al romanzo → tecnica dell'impersonalità ed «eclissi dell'autore»"],
    ["Positivismo e darwinismo sociale", "la lotta per la vita e la legge del più forte → il «Ciclo dei Vinti»"],
    ["La Sicilia rurale e il mondo dei pescatori", "i ricordi della terra natale → I Malavoglia e il villaggio di Aci Trezza"],
    ["La «questione meridionale» (inchiesta Franchetti-Sonnino)", "la realtà di miseria e arretratezza del Sud → denuncia implicita"],
    ["Il fallimento dei romanzi mondani milanesi", "l'insoddisfazione per il sentimentalismo borghese → la svolta verso il «vero»"],
  ]},
  318: { intro: "Le esperienze e le letture che alimentarono la poesia di Pascoli:", items: [
    ["Il trauma dell'assassinio del padre (1867)", "la perdita e il lutto familiare → mito del «nido» e poetica del dolore"],
    ["Il Simbolismo francese (Baudelaire, Verlaine)", "l'uso dell'analogia e del simbolo → fonosimbolismo e linguaggio evocativo"],
    ["La campagna romagnola", "i suoni e le immagini della natura → onomatopee e impressionismo (Myricae)"],
    ["Il mondo dell'infanzia", "lo sguardo ingenuo e stupito sulle cose → poetica del «fanciullino»"],
    ["La tradizione classica e Carducci", "la formazione latina e metrica → rigore formale e riuso dotto"],
  ]},
  333: { intro: "Le fonti del superomismo e dell'estetismo dannunziano:", items: [
    ["Nietzsche (superuomo, volontà di potenza)", "il mito dell'individuo eccezionale → superomismo e Le vergini delle rocce"],
    ["L'Estetismo europeo (Wilde, Huysmans, Pater)", "la vita come opera d'arte e il culto del Bello → Il Piacere"],
    ["La sensualità mediterranea e i classici", "il panismo e la fusione con la natura → Alcyone (La pioggia nel pineto)"],
    ["Il nazionalismo e il mito di Roma", "l'esaltazione della grandezza italica → interventismo e impresa di Fiume"],
    ["La musica (Wagner)", "la ricerca di sonorità e ritmo → musicalità del verso"],
  ]},
  382: { intro: "Ciò che generò la poetica dell'umorismo e il tema della maschera:", items: [
    ["Il relativismo e la crisi delle certezze positiviste", "il crollo dell'idea di una verità unica → contrasto vita/forma e «maschere»"],
    ["La malattia mentale della moglie Antonietta", "la convivenza con la follia e la gelosia → identità incerta e relativismo del reale"],
    ["Bergson (durata, slancio vitale) e Binet (personalità)", "la fluidità dell'io → flusso vitale e personalità molteplice"],
    ["L'umorismo come «sentimento del contrario»", "la riflessione che scompone il comico → saggio L'umorismo"],
    ["La condizione siciliana e piccolo-borghese", "ambienti e tipi umani osservati → personaggi e novelle"],
  ]},
  409: { intro: "Le idee e l'ambiente che fecero nascere la figura dell'inetto:", items: [
    ["La psicoanalisi di Freud", "l'inconscio e i meccanismi della psiche → La coscienza di Zeno e la «malattia»"],
    ["Schopenhauer e Darwin", "il pessimismo e l'inadattabilità alla vita → l'«inetto»"],
    ["La Trieste mercantile e mitteleuropea", "il mondo degli affari e della borghesia → ambienti e lingua dei romanzi"],
    ["L'amicizia con James Joyce (suo insegnante d'inglese)", "l'incoraggiamento e il modernismo europeo → riscoperta dopo l'insuccesso"],
    ["La propria vita di uomo d'affari e fumatore", "l'autobiografia ironica → l'ultima sigaretta di Zeno"],
  ]},
  384: { intro: "L'esperienza e le letture che resero essenziale la parola di Ungaretti:", items: [
    ["La Prima Guerra Mondiale in trincea (Carso)", "la vita esposta alla morte → L'Allegria e la parola «scavata»"],
    ["Il Simbolismo francese (Mallarmé, Apollinaire)", "frequentato a Parigi → analogia, verso libero, parola isolata"],
    ["L'infanzia ad Alessandria d'Egitto e il deserto", "il senso di sradicamento e precarietà → nomadismo, «I fiumi»"],
    ["La fragilità della vita di fronte alla morte", "la fratellanza nel pericolo → «Veglia», «Fratelli»"],
    ["La conversione e il lutto del figlio (più tardi)", "la sofferenza e la fede → Sentimento del tempo, Il dolore"],
  ]},
  411: { intro: "Le radici del «male di vivere» e del correlativo oggettivo:", items: [
    ["Il «male di vivere» e la crisi del Novecento", "la disarmonia tra io e mondo → Ossi di seppia, pessimismo"],
    ["Il paesaggio aspro della Liguria", "oggetti e scenari concreti → correlativo oggettivo e simboli-cosa"],
    ["T.S. Eliot e il Simbolismo", "la tecnica dell'objective correlative → emozione affidata agli oggetti"],
    ["La filosofia (Schopenhauer, Bergson)", "la disillusione e l'impossibilità di certezze → il «varco»"],
    ["Le figure femminili (Clizia / Irma Brandeis)", "la donna come salvezza → senhal de Le occasioni"],
  ]},
  430: { intro: "Le fonti della «poesia onesta» di Saba:", items: [
    ["La psicoanalisi e la propria nevrosi", "l'autoanalisi e i conflitti interiori → Il Canzoniere"],
    ["La città di Trieste", "la quotidianità e i luoghi vissuti → realismo affettuoso"],
    ["Il rapporto difficile con la madre e l'assenza paterna", "la «scissione» interiore → tema dell'identità divisa"],
    ["La tradizione (Petrarca, Leopardi)", "la chiarezza metrica → antinovecentismo, lingua piana"],
    ["L'amore per la moglie Lina e la vita semplice", "gli affetti domestici → «A mia moglie»"],
  ]},
  439: { intro: "Dall'Ermetismo all'impegno: cosa ispirò Quasimodo:", items: [
    ["L'Ermetismo e il Simbolismo", "la poesia «pura» e la folgorazione breve → «Ed è subito sera»"],
    ["La Sicilia e il mito greco-mediterraneo", "le traduzioni dei lirici greci → memoria e nostalgia"],
    ["La Seconda Guerra Mondiale e la Resistenza", "l'orrore e l'impegno civile → «Alle fronde dei salici»"],
    ["Il dolore collettivo del dopoguerra", "la responsabilità del poeta → «Uomo del mio tempo»"],
  ]},
  424: { intro: "Le ragioni dell'ironia crepuscolare di Gozzano:", items: [
    ["La reazione al modello dannunziano", "il rifiuto del Vate e dell'eroismo → ironia e demistificazione"],
    ["Il Crepuscolarismo", "i temi dimessi e quotidiani → «le buone cose di pessimo gusto»"],
    ["La malattia (tubercolosi) e il senso di morte", "la vita «non vissuta» → malinconia"],
    ["Il gusto del passato e del kitsch borghese", "oggetti desueti e nostalgia → La signorina Felicita"],
  ]},
  437: { intro: "Cosa accese la rivoluzione futurista di Marinetti:", items: [
    ["La modernità: macchina, velocità, città industriale", "il mito del dinamismo → Manifesto del Futurismo"],
    ["Il rifiuto del passato (musei, accademie)", "la lotta contro il «passatismo» → distruzione della tradizione"],
    ["Il mito della guerra «sola igiene del mondo»", "l'aggressività e il nazionalismo → interventismo"],
    ["Le avanguardie europee e la provocazione", "la rottura formale → «parole in libertà» e serate futuriste"],
  ]},
  377: { intro: "Baudelaire, padre del Simbolismo: le sue fonti d'ispirazione:", items: [
    ["La modernità urbana di Parigi", "il disagio e la noia esistenziale → spleen (Les Fleurs du mal)"],
    ["L'idea di «corrispondenze» tra sensi e mondo", "i legami nascosti tra le cose → sinestesia e simbolo"],
    ["Edgar Allan Poe (che tradusse)", "il fascino del male e del mistero → estetica del «maledetto»"],
    ["La condizione del poeta emarginato", "l'incomprensione della società → «L'albatro»"],
  ]},
  309: { intro: "L'esperienza personale e sociale alla base dei romanzi di Dickens:", items: [
    ["L'infanzia povera e il lavoro minorile (fabbrica di lucido)", "il trauma dello sfruttamento → Oliver Twist, David Copperfield"],
    ["I mali dell'Inghilterra vittoriana (workhouse, slums)", "la miseria urbana → denuncia sociale"],
    ["L'industrializzazione e le città-fabbrica", "la disumanizzazione → Coketown in Hard Times"],
    ["L'utilitarismo di Bentham (criticato)", "il culto dei soli «fatti» → satira in Hard Times"],
    ["La pubblicazione a puntate (serialità)", "il rapporto col pubblico → trame avvincenti e cliffhanger"],
  ]},
  321: { intro: "Le fonti dell'estetismo e del dandismo di Wilde:", items: [
    ["L'Estetismo e Walter Pater («art for art's sake»)", "l'arte come valore assoluto → prefazione a Il ritratto di Dorian Gray"],
    ["La cultura decadente francese (Huysmans, À rebours)", "il «libro giallo» che corrompe Dorian → estetismo decadente"],
    ["Il mito di Faust e il tema del doppio", "il patto e l'eterna giovinezza → il ritratto che invecchia"],
    ["L'ipocrisia della società vittoriana", "la critica dei costumi → aforismi e commedie brillanti"],
    ["La propria vita scandalosa e il processo", "la caduta e la prigione → De Profundis"],
  ]},
  345: { intro: "Cosa ispirò il ritratto del sogno americano di Fitzgerald:", items: [
    ["L'«età del jazz» e i ruggenti anni Venti", "feste, lusso ed eccessi → Il Grande Gatsby"],
    ["Il sogno americano e la sua corruzione", "l'illusione che il denaro compri tutto → ascesa e caduta di Gatsby"],
    ["L'amore tormentato per Zelda e l'alta società", "il desiderio e lo status → Daisy, autobiografismo"],
    ["La «lost generation» del dopoguerra", "il vuoto morale e la disillusione → decadenza dei personaggi"],
    ["Il contrasto tra «vecchio» e «nuovo» denaro", "l'esclusione sociale → East Egg vs West Egg"],
  ]},
  350: { intro: "Le esperienze che generarono la distopia di Orwell:", items: [
    ["I totalitarismi (stalinismo, nazismo)", "il culto del capo e il partito unico → Big Brother in 1984"],
    ["La guerra civile spagnola (vissuta in prima persona)", "la propaganda e i tradimenti → diffidenza verso il potere"],
    ["La manipolazione del linguaggio e della verità", "la lingua come strumento di controllo → Neolingua e bispensiero"],
    ["La sorveglianza e il controllo statale", "l'occhio sempre vigile → telescreen e Grande Fratello"],
    ["Il socialismo democratico e la giustizia sociale", "la critica di ogni potere oppressivo → impegno civile"],
  ]},
  388: { intro: "L'idealismo patriottico dietro «The Soldier» di Brooke:", items: [
    ["L'entusiasmo patriottico dell'inizio della guerra (1914)", "il sacrificio visto come nobile → «The Soldier»"],
    ["Il patriottismo e l'amor di patria", "l'Inghilterra come terra sacra → idealizzazione della morte in guerra"],
    ["La tradizione romantica e georgiana", "il tono idilliaco e la natura inglese → linguaggio elevato"],
    ["La morte precoce (1915), prima del fronte", "l'assenza di disillusione → visione non ancora segnata dall'orrore"],
  ]},
  415: { intro: "L'esperienza di trincea che ispirò la «pity of war» di Owen:", items: [
    ["L'esperienza diretta della trincea", "gli orrori del fronte → realismo crudo di «Dulce et Decorum Est»"],
    ["La denuncia della retorica patriottica", "lo smascheramento dell'«old Lie» → antimilitarismo"],
    ["L'incontro con Siegfried Sassoon (Craiglockhart)", "la guida poetica e la protesta → svolta nello stile"],
    ["La compassione per i soldati («the pity of war»)", "l'empatia per le vittime → tema centrale della sua poesia"],
    ["La ricerca tecnica (pararima)", "consonanze dissonanti → senso di disagio e sospensione"],
  ]},
};

const insert = db.prepare(
  'INSERT INTO pages (user_id, space_id, parent_page_id, title, content, icon, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

const tx = db.transaction(() => {
  let created = 0, skipped = 0;
  for (const [pid, { intro, items }] of Object.entries(data)) {
    const parent = db.prepare('SELECT id, user_id, space_id, title FROM pages WHERE id = ?').get(pid);
    if (!parent) { console.log(`!! parent ${pid} non trovato, salto`); continue; }
    const exists = db.prepare("SELECT id FROM pages WHERE parent_page_id = ? AND title = 'Ispirazioni'").get(pid);
    if (exists) { console.log(`= ${parent.title}: già presente (page ${exists.id}), salto`); skipped++; continue; }
    const next = db.prepare('SELECT COALESCE(MAX(order_index),-1)+1 n FROM pages WHERE parent_page_id = ?').get(pid).n;
    const info = insert.run(parent.user_id, parent.space_id, parent.id, 'Ispirazioni', doc(intro, items), '💡', next);
    console.log(`+ ${parent.title}: creata "Ispirazioni" (page ${info.lastInsertRowid}, ${items.length} punti)`);
    created++;
  }
  console.log(`\nFatto. Create: ${created}, saltate: ${skipped}`);
});

tx();
db.close();
