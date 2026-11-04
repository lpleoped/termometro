# Smoke checklist — Termómetro de Equipo

Verificación rápida post-setup. Ver [CORRIDA_LOCAL.md](./CORRIDA_LOCAL.md).

## Precondiciones

- [ ] MongoDB corriendo
- [ ] `npm install` hecho
- [ ] `.env` de api y web creados desde `.env.example`
- [ ] `npm run seed` OK
- [ ] `npm run dev:api` y `npm run dev:web` corriendo

## Flujo

1. [ ] http://localhost:3000/api/health → `ok: true`, `mongo: connected`
2. [ ] http://localhost:5173 → home con marca **Termómetro de Equipo**
3. [ ] Login: `test@test.com` / `123123`
4. [ ] Backoffice home → se ven equipos (QA / Frontend / Backend)
5. [ ] Evaluaciones → aparecen las 3 del seed
6. [ ] Dashboard de un equipo/instancia → índice 0–100 + participación + secciones
7. [ ] Pestaña histórico → al menos un punto en el tiempo
8. [ ] Copiar link `/responder/:instanciaId`, abrir en otra pestaña (sin login)
9. [ ] Completar Likert 1–5 y enviar → mensaje de gracias
10. [ ] Volver al dashboard → participación/índice coherentes con la nueva respuesta

## Credenciales demo

| Usuario | Password |
|---------|----------|
| `test@test.com` | `123123` |
