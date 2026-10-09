import React from 'react';

const TEMPLATES = [
  {
    icon: '🎯',
    label: '2D Platformer',
    prompt:
      'A 2D side-scrolling platformer with a ninja character. Features: double jump, wall slide, collectible coins, patrolling enemies to stomp on, multiple platforms, parallax background, particle effects on landing, and a level-end flag. Use Phaser 3.',
  },
  {
    icon: '🌌',
    label: '3D Space Shooter',
    prompt:
      'A 3D space shooter using Three.js. Player flies a ship through an asteroid field, shoots lasers at enemy ships, has a shield bar and health. Stars in the background, particle explosions, and a score system. Mouse to aim, WASD to move, click to shoot.',
  },
  {
    icon: '🧩',
    label: 'Puzzle Game',
    prompt:
      'A 2D match-3 puzzle game like Bejeweled. Swap adjacent gems to make lines of 3+, animated falling gems, combo scoring, move counter, and satisfying particle bursts when gems clear. Use Phaser 3.',
  },
  {
    icon: '🏎️',
    label: 'Racing Game',
    prompt:
      'A 3D endless racing game with Three.js. Player drives a car down a never-ending road, dodging traffic, collecting speed boosts. Increasing difficulty, speedometer HUD, and a game-over crash screen.',
  },
  {
    icon: '⚔️',
    label: 'Roguelike RPG',
    prompt:
      'A 2D top-down roguelike dungeon crawler. Procedurally generated rooms, sword combat, enemies with AI, health potions, treasure chests, and a minimap. Pixel-art style using Phaser 3 with procedural graphics.',
  },
  {
    icon: '🐍',
    label: 'Classic Snake',
    prompt:
      'A polished modern Snake game. Neon grid background, glowing snake with a trail effect, growing on food pickup, speed ramping up, high score saved, and a slick game-over animation. Use HTML5 Canvas.',
  },
];

export default function QuickTemplates({ onSelect }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-studio-text-muted mb-2">Quick Start</div>
      <div className="grid grid-cols-2 gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            onClick={() => onSelect(t.prompt)}
            className="text-left px-2.5 py-2 rounded-md bg-studio-panel border border-studio-border hover:border-studio-gold/40 hover:bg-studio-gold/5 transition-all group"
          >
            <div className="text-sm mb-0.5">{t.icon}</div>
            <div className="text-[11px] text-studio-text-dim group-hover:text-studio-text transition-colors">
              {t.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
