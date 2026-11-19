import { conexionLista } from './conexionProveedor.ts';

function igual(condicion: boolean, mensaje: string) {
  if (!condicion) throw new Error(mensaje);
}

const casos: Array<[string, readonly string[], string, string]> = [
  ['una sola queda elegida', ['a'], '', 'a'],
  ['una sola gana sobre una elección vieja', ['a'], 'otra', 'a'],
  ['varias piden una elección', ['a', 'b'], '', ''],
  ['varias conservan la elección hecha', ['a', 'b'], 'b', 'b'],
  ['una elección que ya no está no cuenta', ['a', 'b'], 'c', ''],
  ['sin conexiones no hay elección', [], '', ''],
];

casos.forEach(([nombre, ids, elegida, esperado]) => {
  const resultado = conexionLista(ids, elegida);
  igual(resultado === esperado, `${nombre}: quedó «${resultado}», se esperaba «${esperado}»`);
  console.log(`✓ ${nombre}`);
});
