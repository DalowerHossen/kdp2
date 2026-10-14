#!/usr/bin/env node
// path: scripts/build-design-tokens.mjs
// Generates app/globals.css from config/design-tokens.json (single source of
// truth). `npm run tokens` writes; `npm run tokens:check` only verifies that
// the committed css matches the tokens (drift guard in `npm run verify`).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const tokens = JSON.parse(readFileSync('config/design-tokens.json', 'utf8'));

function cssVarName(key) {
  return key.replaceAll(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function colorBlock(mode) {
  const lines = [];
  for (const [name, pair] of Object.entries(tokens.color)) {
    lines.push(`    --${cssVarName(name)}: ${pair[mode]};`);
  }
  return lines.join('\n');
}

export function generate() {
  return `/* GENERATED FILE - do not edit by hand.
   Source of truth: config/design-tokens.json
   Regenerate: npm run tokens | Check: npm run tokens:check */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${colorBlock('light')}
    --radius-sm: ${tokens.radius.sm};
    --radius-md: ${tokens.radius.md};
    --radius-lg: ${tokens.radius.lg};
    --radius-xl: ${tokens.radius.xl};
    --motion-fast: ${tokens.motion.fast};
    --motion-normal: ${tokens.motion.normal};
    --motion-slow: ${tokens.motion.slow};
    --motion-ease-out: ${tokens.motion.easeOut};
  }

  .dark {
${colorBlock('dark')}
  }

  * {
    border-color: hsl(var(--border));
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }

  ::selection {
    background-color: hsl(var(--primary) / 0.9);
    color: hsl(var(--primary-foreground));
  }

  :focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  .text-pretty {
    text-wrap: pretty;
  }
}
`;
}

const check = process.argv.includes('--check');
const target = 'app/globals.css';
const expected = generate();

if (check) {
  if (!existsSync(target)) {
    console.error(`design-tokens: ${target} missing; run npm run tokens`);
    process.exit(1);
  }
  const actual = readFileSync(target, 'utf8');
  if (actual !== expected) {
    console.error('design-tokens: app/globals.css is out of date; run npm run tokens');
    process.exit(1);
  }
  console.log('design-tokens: OK (app/globals.css matches config/design-tokens.json)');
} else {
  writeFileSync(target, expected);
  console.log(`design-tokens: wrote ${target}`);
}
