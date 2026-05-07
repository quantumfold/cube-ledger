"use client";

import { CloudOff, Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Player } from "@/lib/types";

export function FastEntryPanel({ players }: { players: Player[] }) {
  const [selected, setSelected] = useState<string[]>(["p1", "p2", "p3", "p4"]);
  const [format, setFormat] = useState<"Individual" | "Team">("Individual");
  const [queued, setQueued] = useState(0);
  const selectedNames = useMemo(() => players.filter((player) => selected.includes(player.id)).map((player) => player.displayName), [players, selected]);

  return (
    <section className="panel panel-pad">
      <div className="section-title">
        <h2>Fast Draft Entry</h2>
        <span className="pill">Offline queue: {queued}</span>
      </div>
      <div className="offline"><CloudOff size={16} /> Entries save locally first and sync with conflict checks when connection returns.</div>
      <div className="entry-grid" style={{ marginTop: 14 }}>
        <input aria-label="Draft title" defaultValue="Tuesday Cube Draft" />
        <input aria-label="Draft date" type="date" defaultValue="2026-05-05" />
        <select aria-label="Draft format" value={format} onChange={(event) => setFormat(event.target.value as "Individual" | "Team")}>
          <option>Individual</option>
          <option>Team</option>
        </select>
        <select aria-label="Draft type" defaultValue="Vintage">
          {["Vintage", "Andrew Cube", "Morgan Cube"].map((type) => <option key={type}>{type}</option>)}
        </select>
        <input aria-label="Stake" defaultValue="$50" />
      </div>
      <div style={{ marginTop: 14 }}>
        <strong>Players</strong>
        <div className="pill-row" style={{ marginTop: 8 }}>
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              className={selected.includes(player.id) ? "primary" : ""}
              onClick={() => setSelected((current) => current.includes(player.id) ? current.filter((id) => id !== player.id) : [...current, player.id])}
            >
              {player.displayName}
            </button>
          ))}
        </div>
      </div>
      {format === "Team" ? (
        <div style={{ marginTop: 14 }}>
          <strong>Team setup</strong>
          <div className="entry-grid" style={{ marginTop: 8 }}>
            {selectedNames.map((name, index) => (
              <select key={name} aria-label={`${name} team`} defaultValue={index % 2 === 0 ? "A" : "B"}>
                <option value="A">{name}: Team A</option>
                <option value="B">{name}: Team B</option>
              </select>
            ))}
            <select aria-label="Winning team" defaultValue="A">
              <option value="">Winning team not set</option>
              <option value="A">Team A won</option>
              <option value="B">Team B won</option>
            </select>
          </div>
        </div>
      ) : null}
      <div className="entry-grid" style={{ marginTop: 14 }}>
        <select aria-label="Player A">{selectedNames.map((name) => <option key={name}>{name}</option>)}</select>
        <select aria-label="Player B">{selectedNames.map((name) => <option key={name}>{name}</option>)}</select>
        <select aria-label="Match result" defaultValue="2-1">
          {["2-0", "2-1", "1-1-1", "1-2", "0-2"].map((result) => <option key={result}>{result}</option>)}
        </select>
        <input aria-label="Sidebet amount" placeholder="Sidebet, default $0" defaultValue="$0" />
        <select aria-label="Sidebet winner" defaultValue="">
          <option value="">No sidebet</option>
          {selectedNames.map((name) => <option key={name}>{name} won sidebet</option>)}
        </select>
        <input aria-label="Match notes" placeholder="Notes" />
      </div>
      <div className="inline-actions" style={{ marginTop: 14 }}>
        <button type="button" onClick={() => setQueued((value) => value + 1)}><Plus size={16} /> Queue match</button>
        <button type="button" className="primary" onClick={() => setQueued(0)}><Save size={16} /> Sync draft</button>
      </div>
    </section>
  );
}
