import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

/**
 * Repairs legacy UTF-8 text that was decoded as Windows-1252/Latin-1 before
 * it reaches the browser.  The project still contains a few historical
 * literals in that form; keeping the repair at the module boundary prevents
 * a malformed label from leaking into any screen while those literals are
 * progressively cleaned up.
 */
function repairMojibake(value: string): string {
  const cp1252: Record<string, number> = {
    '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
    'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91,
    '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98,
    '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
  };
  const mojibake = /[ÃÂâð](?:[\u0080-\u00ff\u0192\u20ac\u2018-\u2022\u2026\u2030\u2122\u0178])+/g;
  let repaired = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = repaired.replace(mojibake, (fragment) => {
      try {
        return Buffer.from([...fragment].map((character) => cp1252[character] ?? character.codePointAt(0) ?? 0)).toString('utf8');
      } catch {
        return fragment;
      }
    });
    if (next === repaired) break;
    repaired = next;
  }
  return repaired;
}

const textEncodingGuard = {
  name: 'text-encoding-guard',
  transform(code: string, id: string) {
    if (!/\/src\/.*\.(?:[cm]?[jt]sx?|css)$/.test(id) || !/[\u00c2-\u00f4][\u0080-\u00bf]/.test(code)) return null;
    return { code: repairMojibake(code), map: null };
  },
};

export default defineConfig({
  plugins: [textEncodingGuard, react()],
  server: {
    port: 5173,
  },
});
