import type { ContextualAction } from '@termometro/shared';
import type { SelectedTeamContextItem } from './context-engine.service';

export class ActionPolicyError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/**
 * Verifica que el plan propuesto no ignore condiciones explícitas del equipo.
 * La validación es deliberadamente conservadora: no decide si una acción es
 * buena, solo impide aceptar una salida que contradice el contrato contextual.
 */
export const validateContextualActions = (actions: ContextualAction[], contextItems: SelectedTeamContextItem[]) => {
  const required = contextItems.filter(item => ['precondition', 'action'].includes(item.influence) && ['relevant', 'critical'].includes(item.importance));
  const groupOnly = contextItems.filter(item => item.influence === 'group_action' || item.sensitivity === 'highly_sensitive');

  for (const context of required) {
    const related = actions.filter(action => action.contextoAplicado?.includes(context.id));
    if (related.length === 0) throw new ActionPolicyError('AI_CONTEXT_IGNORED', `El análisis no generó una acción trazable para el contexto crítico “${context.title}”.`);
    if (context.influence === 'precondition' && !related.some(action => action.esCondicionPrevia === true)) throw new ActionPolicyError('AI_PRECONDITION_IGNORED', `El contexto “${context.title}” requiere una acción marcada como condición previa.`);
  }

  for (const context of groupOnly) {
    const related = actions.filter(action => action.contextoAplicado?.includes(context.id));
    const groupScopes = new Set(['equipo', 'liderazgo', 'proyecto']);
    if (related.some(action => !groupScopes.has(action.alcance))) throw new ActionPolicyError('AI_SENSITIVE_SCOPE', `La información sensible “${context.title}” solo puede generar acciones grupales, nunca dirigidas a una persona.`);
  }
  return actions;
};
