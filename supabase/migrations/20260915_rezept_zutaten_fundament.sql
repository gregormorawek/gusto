-- Migration: Fundament fuer den Datenmodell-Umbau (Etappe 1 von 4, siehe
-- gusto-datenmodell-umbau.md). Rein additiv - die laufende App merkt davon
-- nichts, die select()-Klausel in App.jsx bleibt unangetastet.
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).
-- Noch NICHT ausgefuehrt - Gregor fuehrt sie manuell aus.

-- Pro-100g-Annahme fuer zutaten.kalorien/protein_g/carbs_g/fett_g an
-- echten Zeilen verifiziert (Olivenoel, Butter, Mandeln, Haehnchenbrust,
-- Reis) - siehe Chatverlauf. Die Funktion unten rechnet entsprechend.

-- 1) Verbindungstabelle: ein Rezept hat beliebig viele Zutaten-Zeilen.
create table if not exists rezept_zutaten (
  id              bigint generated always as identity primary key,
  rezept_id       bigint not null references rezepte(id) on delete cascade,
  zutat_id        bigint not null references zutaten(id) on delete restrict,

  -- Fuer die Berechnung: immer in Gramm, immer fuer die Basis-Portionenzahl.
  menge_g         numeric not null,

  -- Fuer die Anzeige: was der Mensch liest.
  anzeige_menge   numeric not null,
  anzeige_einheit text    not null,   -- 'g','ml','EL','TL','Stueck','Prise','Zehe'
  anmerkung       text,               -- 'mittelscharf', 'gehackt', 'optional'

  optional        boolean not null default false,
  sortierung      smallint not null default 0,

  created_at      timestamptz not null default now()
);

create index if not exists rezept_zutaten_rezept_id_idx on rezept_zutaten (rezept_id);
create unique index if not exists rezept_zutaten_rezept_zutat_unique on rezept_zutaten (rezept_id, zutat_id);

-- RLS im selben Muster wie rezepte: oeffentlich lesbar, Schreiben nur
-- manuell ueber den Table Editor (kein Insert/Update/Delete-Policy).
alter table rezept_zutaten enable row level security;

create policy "rezept_zutaten oeffentlich lesbar"
  on rezept_zutaten for select
  using (true);

-- 2) Neue Spalten auf rezepte. Alle nullable bzw. mit Default - bestehende
--    30 Zeilen bleiben unveraendert gueltig.
alter table rezepte
  add column if not exists portionen smallint not null default 1,
  add column if not exists tipps jsonb,
  add column if not exists kcal_pro_portion    numeric,
  add column if not exists protein_pro_portion numeric,
  add column if not exists carbs_pro_portion   numeric,
  add column if not exists fett_pro_portion    numeric;

-- 3) Neuberechnungs-Funktion. Nimmt zutaten.kalorien/protein_g/carbs_g/
--    fett_g als Werte PRO 100 G an (verifiziert, siehe oben).
--    optional=true-Zutaten zaehlen bewusst nicht in die Naehrwerte.
create or replace function rezept_naehrwerte_neu_berechnen(p_rezept_id bigint)
returns void language plpgsql as $$
begin
  update rezepte r set
    kcal_pro_portion    = sub.kcal / r.portionen,
    protein_pro_portion = sub.protein / r.portionen,
    carbs_pro_portion   = sub.carbs / r.portionen,
    fett_pro_portion    = sub.fett / r.portionen
  from (
    select rz.rezept_id,
           sum(z.kalorien  * rz.menge_g / 100) as kcal,
           sum(z.protein_g * rz.menge_g / 100) as protein,
           sum(z.carbs_g   * rz.menge_g / 100) as carbs,
           sum(z.fett_g    * rz.menge_g / 100) as fett
    from rezept_zutaten rz
    join zutaten z on z.id = rz.zutat_id
    where rz.rezept_id = p_rezept_id and rz.optional = false
    group by rz.rezept_id
  ) sub
  where r.id = p_rezept_id and sub.rezept_id = r.id;
end $$;

-- 4) zutaten um Grundzutaten-Flag erweitern (Gewuerze, Oel, Bruehe etc.
--    brauchen keine eigenstaendige Auswahl-Darstellung). Default false -
--    alle 174 bestehenden Zeilen bleiben wie bisher.
alter table zutaten
  add column if not exists ist_grundzutat boolean not null default false;
