#!/usr/bin/env node
// CLI CRUD Trello — outil réutilisable (voir SKILL.md pour l'usage complet).
// Credentials attendues dans .claude/skills/trello/.env (voir .env.example).
//
// But : éviter que l'agent refasse des appels HTTP bruts à l'API Trello à
// chaque demande (lent, coûteux en tokens) — ce script encapsule le CRUD une
// bonne fois pour toutes, on l'appelle ensuite en une commande.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, ".env");
  const env = {};
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const { TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID } = env;

function requireCreds() {
  const missing = ["TRELLO_API_KEY", "TRELLO_TOKEN", "TRELLO_BOARD_ID"].filter(
    (k) => !env[k],
  );
  if (missing.length) {
    console.error(
      `Variables manquantes dans ${join(__dirname, ".env")} : ${missing.join(", ")}`,
    );
    console.error("Voir .env.example pour le format attendu.");
    process.exit(1);
  }
}

const API = "https://api.trello.com/1";

async function trelloFetch(path, { method = "GET", params = {} } = {}) {
  const url = new URL(API + path);
  url.searchParams.set("key", TRELLO_API_KEY);
  url.searchParams.set("token", TRELLO_TOKEN);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url, { method });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`Trello API ${method} ${path} → HTTP ${res.status} : ${detail}`);
  }
  return body;
}

async function getLists() {
  return trelloFetch(`/boards/${TRELLO_BOARD_ID}/lists`);
}

async function getCards() {
  return trelloFetch(`/boards/${TRELLO_BOARD_ID}/cards`);
}

async function resolveListId(nameOrId) {
  const lists = await getLists();
  const byId = lists.find((l) => l.id === nameOrId);
  if (byId) return byId;
  const byName = lists.find((l) => l.name.toLowerCase() === nameOrId.toLowerCase());
  if (byName) return byName;
  throw new Error(
    `Liste "${nameOrId}" introuvable. Listes disponibles : ${lists.map((l) => l.name).join(", ")}`,
  );
}

async function resolveCard(nameOrId) {
  // Un id Trello fait 24 caractères hexadécimaux.
  if (/^[0-9a-f]{24}$/i.test(nameOrId)) {
    try {
      return await trelloFetch(`/cards/${nameOrId}`);
    } catch {
      // pas trouvé par id : on retente par nom ci-dessous
    }
  }
  const cards = await getCards();
  const needle = nameOrId.toLowerCase();
  const matches = cards.filter((c) => c.name.toLowerCase().includes(needle));
  if (matches.length === 0) throw new Error(`Aucune carte trouvée pour "${nameOrId}".`);
  if (matches.length > 1) {
    const list = matches.map((c) => `- ${c.name} (${c.id})`).join("\n");
    throw new Error(`Plusieurs cartes correspondent à "${nameOrId}", précise l'id :\n${list}`);
  }
  return matches[0];
}

function printCard(card) {
  console.log(card.name);
  console.log(`  id: ${card.id}`);
  console.log(`  liste: ${card.idList}`);
  if (card.desc) console.log(`  description: ${card.desc}`);
  if (card.due) console.log(`  échéance: ${card.due}`);
  console.log(`  url: ${card.shortUrl || card.url}`);
}

const [, , command, ...args] = process.argv;

const KNOWN_COMMANDS = [
  "lists",
  "create-list",
  "create",
  "read",
  "update",
  "move",
  "delete",
  "find",
];

async function main() {
  if (KNOWN_COMMANDS.includes(command)) requireCreds();

  switch (command) {
    case "lists": {
      const lists = await getLists();
      for (const l of lists) console.log(`${l.name} (${l.id})`);
      break;
    }

    case "create-list": {
      const [name] = args;
      if (!name) throw new Error('Usage: trello create-list "<nom>"');
      const list = await trelloFetch(`/boards/${TRELLO_BOARD_ID}/lists`, {
        method: "POST",
        params: { name, pos: "bottom" },
      });
      console.log(`Liste créée : ${list.name} (${list.id})`);
      break;
    }

    case "create": {
      const [name, listName] = args;
      if (!name) throw new Error('Usage: trello create "<titre>" [liste]');
      const list = listName ? await resolveListId(listName) : (await getLists())[0];
      const card = await trelloFetch("/cards", {
        method: "POST",
        params: { idList: list.id, name },
      });
      console.log(`Carte créée dans "${list.name}" :`);
      printCard(card);
      break;
    }

    case "read": {
      const [nameOrId] = args;
      if (!nameOrId) throw new Error("Usage: trello read <id|nom>");
      printCard(await resolveCard(nameOrId));
      break;
    }

    case "update": {
      const [nameOrId, ...rest] = args;
      if (!nameOrId || rest.length === 0) {
        throw new Error('Usage: trello update <id|nom> --title="..." [--desc="..."]');
      }
      const card = await resolveCard(nameOrId);
      const params = {};
      for (const arg of rest) {
        const m = arg.match(/^--(title|desc)=(.*)$/s);
        if (!m) throw new Error(`Option inconnue : ${arg}`);
        params[m[1] === "title" ? "name" : "desc"] = m[2];
      }
      const updated = await trelloFetch(`/cards/${card.id}`, { method: "PUT", params });
      console.log("Carte mise à jour :");
      printCard(updated);
      break;
    }

    case "move": {
      const [nameOrId, listName] = args;
      if (!nameOrId || !listName) throw new Error("Usage: trello move <id|nom> <liste>");
      const card = await resolveCard(nameOrId);
      const list = await resolveListId(listName);
      const updated = await trelloFetch(`/cards/${card.id}`, {
        method: "PUT",
        params: { idList: list.id },
      });
      console.log(`Carte déplacée vers "${list.name}" :`);
      printCard(updated);
      break;
    }

    case "delete": {
      const [nameOrId] = args;
      if (!nameOrId) throw new Error("Usage: trello delete <id|nom>");
      const card = await resolveCard(nameOrId);
      await trelloFetch(`/cards/${card.id}`, { method: "DELETE" });
      console.log(`Carte supprimée : ${card.name} (${card.id})`);
      break;
    }

    case "find": {
      const [text] = args;
      if (!text) throw new Error("Usage: trello find <texte>");
      const cards = await getCards();
      const needle = text.toLowerCase();
      const matches = cards.filter((c) => c.name.toLowerCase().includes(needle));
      if (matches.length === 0) console.log("Aucune carte trouvée.");
      else for (const c of matches) printCard(c);
      break;
    }

    default:
      console.log(`Usage: trello <commande> [args]

Commandes :
  lists                               liste les colonnes du board
  create-list "<nom>"                 crée une liste (colonne)
  create "<titre>" [liste]            crée une carte (défaut : 1ère liste)
  read <id|nom>                       affiche une carte
  update <id|nom> --title="..." [--desc="..."]
  move <id|nom> <liste>               déplace une carte
  delete <id|nom>                     supprime une carte
  find <texte>                        cherche une carte par nom`);
      if (command) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
