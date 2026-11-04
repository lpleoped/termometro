import type { SelectedTeamContextItem } from './context-engine.service';

const redactCommonIdentifiers = (value: string) => value
  .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[dato de contacto]')
  .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[teléfono]')
  .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[enlace]');

/**
 * Reduce contexto antes de cruzar el límite hacia un proveedor externo.
 * Para información altamente sensible se conserva la intención operativa,
 * nunca el relato personal original.
 */
export const toSafeTeamContext = (item: SelectedTeamContextItem): SelectedTeamContextItem => {
  if (item.sensitivity === 'highly_sensitive') {
    const safeContent = item.influence === 'do_not_act_directly'
      ? 'Existe información sensible que no debe convertirse en una acción directa sobre personas. Considerar únicamente mejoras generales y preventivas del equipo.'
      : item.influence === 'group_action' || item.influence === 'interpretation_and_action'
        ? 'Existe una necesidad sensible que debe abordarse mediante una mejora general del equipo, sin identificar ni exponer a integrantes.'
        : 'Existe información sensible relevante para interpretar el contexto. No identificar personas ni reproducir detalles personales.';
    return { ...item, title: 'Necesidad sensible del equipo', content: safeContent, source: undefined };
  }
  if (item.sensitivity === 'sensitive') return { ...item, title: redactCommonIdentifiers(item.title), content: redactCommonIdentifiers(item.content), source: item.source ? redactCommonIdentifiers(item.source) : undefined };
  return item;
};
