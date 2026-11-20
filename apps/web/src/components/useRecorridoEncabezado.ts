import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { AIProviderResponse, AISettings, PasoFacilitador, TeamContextItem } from '@termometro/shared'
import { marcasDeCuestionario } from '../domain/cuestionariosEquipo'
import { pasoDelEquipo } from '../domain/pasoFacilitador'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { getEquipos } from '../services/equipoService'
import { getEvaluaciones } from '../services/evaluacionService'
import { getIAProviders, getIASettings } from '../services/iaSettingsService'
import { getTeamContext } from '../services/teamContextService'

const EQUIPO_ACTIVO = 'termometro-equipo-activo'

interface EquipoMin { _id?: string; id?: string }

function idDe(doc: EquipoMin | null | undefined): string {
  return doc ? String(doc._id || doc.id || '') : ''
}

function equipoEnCurso(ids: string[], search: string): string {
  const params = new URLSearchParams(search)
  const enUrl = params.get('equipo') || params.get('equipoId') || ''
  if (enUrl && ids.includes(enUrl)) return enUrl
  let guardado = ''
  try { guardado = localStorage.getItem(EQUIPO_ACTIVO) || '' } catch { guardado = '' }
  if (guardado && ids.includes(guardado)) return guardado
  return ids[0] || ''
}

async function hayRonda(equipoId: string): Promise<boolean> {
  try {
    const res = await api.get('/instancias', { params: { equipoId } })
    return Array.isArray(res.data) && res.data.length > 0
  } catch {
    return false
  }
}

export interface RecorridoEncabezado {
  listo: boolean
  yaMide: boolean
  paso: PasoFacilitador
  equipoId: string
}

/** Paso y equipo que el encabezado ya usa para marcar el recorrido. */
export function useRecorridoEncabezado(): RecorridoEncabezado {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [listo, setListo] = useState(false)
  const [yaMide, setYaMide] = useState(false)
  const [paso, setPaso] = useState<PasoFacilitador>('crear-equipo')
  const [equipoId, setEquipoId] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      setListo(true)
      setYaMide(false)
      setPaso('crear-equipo')
      setEquipoId('')
      return
    }
    let activo = true
    setListo(false)
    Promise.all([
      getEquipos(),
      getEvaluaciones().catch(() => []),
      getIASettings().catch(() => null),
      getIAProviders().catch(() => [] as AIProviderResponse[]),
    ]).then(async ([equiposRaw, evaluaciones, settings, providers]) => {
      const lista = Array.isArray(equiposRaw) ? equiposRaw as EquipoMin[] : []
      const ids = lista.map(idDe).filter(Boolean)
      const marcas = await Promise.all(ids.map(async (id) => {
        const [ronda, contexto] = await Promise.all([
          hayRonda(id),
          getTeamContext(id).catch(() => [] as TeamContextItem[]),
        ])
        return { equipoId: id, ronda, vigente: contexto.some((item) => item.status !== 'obsolete') }
      }))
      if (!activo) return
      const midio = marcas.some((marca) => marca.ronda)
      const foco = equipoEnCurso(ids, location.search)
      const elegido = marcas.find((marca) => marca.equipoId === foco)
      const ajustes = settings && typeof settings === 'object' ? settings as AISettings : null
      const cuestionarios = marcasDeCuestionario(evaluaciones, foco)
      setEquipoId(foco)
      setYaMide(midio)
      setPaso(pasoDelEquipo({
        tieneEquipo: ids.length > 0,
        settings: ajustes,
        providers: Array.isArray(providers) ? providers : [],
        tieneCuestionario: cuestionarios.tieneCuestionario,
        hayAlgunCuestionario: cuestionarios.hayAlgunCuestionario,
        tieneContexto: Boolean(elegido?.vigente),
        rondaCompartida: Boolean(elegido?.ronda),
      }))
    }).catch(() => {
      if (!activo) return
      setYaMide(false)
      setPaso('crear-equipo')
    }).finally(() => { if (activo) setListo(true) })
    return () => { activo = false }
  }, [isAuthenticated, location.pathname, location.search])

  return { listo, yaMide, paso, equipoId }
}
