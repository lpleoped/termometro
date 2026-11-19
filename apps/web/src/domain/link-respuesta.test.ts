import { direccionesDeRed, linkDeLaPagina } from './link-respuesta.ts';

function igual(condicion: boolean, mensaje: string) {
  if (!condicion) throw new Error(mensaje);
}

const token = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
const pagina = 'http://localhost:5173';
const api = 'http://127.0.0.1:3000';
const lan = `http://192.168.1.20:3000/r/${token}`;
const esperado = `${pagina}/r/${token}`;

igual(linkDeLaPagina(pagina, token) === esperado, 'la página y el API en orígenes distintos: el link tiene que ser el de la página');
igual(linkDeLaPagina(pagina, token) !== `${api}/r/${token}`, 'el link no puede usar el puerto del API');
igual(linkDeLaPagina(pagina, token) === linkDeLaPagina(pagina, token), 'las dos pantallas arman la misma cadena');
igual(linkDeLaPagina(`${pagina}/`, token) === esperado, 'una barra final no duplica la ruta');
igual(linkDeLaPagina(pagina, '') === '', 'sin token no hay link');
igual(linkDeLaPagina('', token) === '', 'sin origen no hay link');

igual(direccionesDeRed([`${api}/r/${token}`, lan], false).length === 0, 'sin red permitida no se muestran direcciones');
const conRed = direccionesDeRed([`${api}/r/${token}`, `http://localhost:3000/r/${token}`, lan, lan], true, esperado);
igual(conRed.length === 1 && conRed[0] === lan, 'con la red permitida queda la dirección de la red, sin loopback ni repetidos');
igual(direccionesDeRed([esperado], true, esperado).length === 0, 'el link de la página no se repite como dirección de red');

console.log('✓ link de la página y direcciones de red');
