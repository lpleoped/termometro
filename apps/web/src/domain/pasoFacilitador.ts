import type { AIProviderResponse, AISettings, PasoFacilitador } from '@termometro/shared';
import { siguientePaso } from '../../../../packages/shared/src/siguiente-paso.ts';

export function pasoDelEquipo(input: {
  tieneEquipo: boolean;
  settings: Pick<AISettings, 'enabled' | 'defaultProviderId'> | null;
  providers: Array<Pick<AIProviderResponse, 'id' | 'status'>>;
  tieneCuestionario: boolean;
  hayAlgunCuestionario: boolean;
  tieneContexto: boolean;
  rondaCompartida: boolean;
}): PasoFacilitador {
  const elegido = input.providers.find((provider) => provider.id === input.settings?.defaultProviderId);
  return siguientePaso({
    tieneEquipo: input.tieneEquipo,
    proveedores: input.providers.length,
    proveedorElegido: Boolean(input.settings?.defaultProviderId),
    proveedorProbado: elegido?.status === 'active',
    iaActiva: Boolean(input.settings?.enabled),
    iaApagadaAProposito: false,
    tieneContexto: input.tieneContexto,
    tieneCuestionario: input.tieneCuestionario,
    hayAlgunCuestionario: input.hayAlgunCuestionario,
    rondaCompartida: input.rondaCompartida,
    lugar: 'recorrido',
  });
}
