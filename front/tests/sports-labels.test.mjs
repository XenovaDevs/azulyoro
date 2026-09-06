import assert from "node:assert/strict";
import { test } from "node:test";
import { sportsCompetitionLabel, sportsPhaseLabel, sportsRoundLabel } from "../lib/sports-labels.ts";

test("Spanish round names preserve league halves, leg and matchday details", () => {
  assert.equal(sportsRoundLabel("Apertura - Quarter-finals - 1st Leg", "es"), "Apertura - Cuartos de final - Ida");
  assert.equal(sportsRoundLabel("Clausura - Semi-finals (2nd Leg)", "es-AR"), "Clausura - Semifinales (Vuelta)");
  assert.equal(sportsRoundLabel("Round of 16 - Leg 2", "es"), "Octavos de final - Vuelta");
  assert.equal(sportsRoundLabel("Group Stage - 6", "es"), "Fase de grupos - 6");
  assert.equal(sportsRoundLabel("Regular Season - Matchday 8", "es"), "Fase regular - Fecha 8");
  assert.equal(sportsRoundLabel("Club Friendlies", "es"), "Amistosos de clubes");
  assert.equal(sportsRoundLabel("Club Friendly", "es"), "Amistosos de clubes");
});

test("preliminary and numbered rounds retain their identity instead of claiming a bracket size", () => {
  for (const [input, expected] of [
    ["Preliminary Round", "Ronda preliminar"],
    ["Qualifying Round - 2", "Ronda clasificatoria - 2"],
    ["Qualification Round 1", "Ronda clasificatoria 1"],
    ["1st Round", "Ronda 1"], ["2nd Round", "Ronda 2"],
    ["3rd Round", "Ronda 3"], ["Fourth Round", "Ronda 4"],
    ["Play-offs", "Eliminatorias"], ["Knockout Stage", "Eliminatorias"],
    ["Third-place Play-off", "Tercer puesto"],
    ["Round of 64", "32avos de final"], ["Round of 32", "16avos de final"],
  ]) assert.equal(sportsRoundLabel(input, "es"), expected);
});

test("table group labels and known phase identifiers are localized", () => {
  assert.equal(sportsRoundLabel("Clausura - Group A", "es"), "Clausura - Grupo A");
  assert.equal(sportsRoundLabel("Annual Table", "es"), "Tabla anual");
  assert.equal(sportsPhaseLabel("playoffs", "es"), "Eliminatorias");
  assert.equal(sportsPhaseLabel("groups", "en"), "Group stage");
  assert.equal(sportsPhaseLabel("clausura", "en"), "Clausura");
});

test("English provider labels and unknown proper names remain unchanged", () => {
  assert.equal(sportsRoundLabel("Qualifying Round - 2", "en"), "Qualifying Round - 2");
  assert.equal(sportsRoundLabel("Zona Campeonato", "es"), "Zona Campeonato");
  assert.equal(sportsRoundLabel(null, "es"), "");
  assert.equal(sportsCompetitionLabel("CONMEBOL Sudamericana", "es"), "CONMEBOL Sudamericana");
  assert.equal(sportsCompetitionLabel("FIFA Club World Cup", "es"), "Mundial de Clubes FIFA");
  assert.equal(sportsCompetitionLabel("Argentine Cup", "es"), "Copa Argentina");
  assert.equal(sportsCompetitionLabel("Friendlies Clubs", "es"), "Amistosos de clubes");
  assert.equal(sportsCompetitionLabel("FIFA Club World Cup", "en"), "FIFA Club World Cup");
});
