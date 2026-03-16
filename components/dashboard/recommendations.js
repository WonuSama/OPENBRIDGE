export function getEditorRecommendations(filePath = "") {
  const normalized = String(filePath).toLowerCase();
  const recommendations = [];

  recommendations.push({
    id: "workspace-scope",
    title: "Mantene este archivo dentro de su rol correcto",
    detail: "Los archivos del workspace deben concentrar comportamiento, memoria y contexto operativo. Evita mezclar aqui configuracion de infraestructura o secretos del sistema.",
  });

  if (normalized.endsWith("agents.md")) {
    recommendations.push(
      {
        id: "agents-role",
        title: "Usalo como manual operativo",
        detail: "Define rutinas, protocolos y uso de herramientas. Si el contenido es de personalidad, identidad o contexto del usuario, suele encajar mejor en otros archivos del workspace.",
      },
      {
        id: "agents-bootstrap",
        title: "Cada cambio impacta sesiones nuevas",
        detail: "Este archivo se vuelve a cargar cuando el agente recompone su contexto. Conviene escribir instrucciones claras y estables, no notas temporales o ruido conversacional.",
      },
      {
        id: "agents-size",
        title: "Mantenelo breve y verificable",
        detail: "Si crece demasiado, parte del contenido puede perder prioridad en el contexto. Es mejor dejar reglas concretas, accionables y faciles de auditar.",
      }
    );
  }

  if (normalized.endsWith("openclaw.json")) {
    recommendations.push(
      {
        id: "json-backup",
        title: "Hace backup antes de editar",
        detail: "Un error de sintaxis o una clave mal ubicada puede impedir que la instancia levante correctamente. Trabaja con cambios pequenos y reversibles.",
      },
      {
        id: "json-validate",
        title: "Valida la sintaxis antes de aplicar cambios",
        detail: "Confirma que el JSON siga siendo valido antes de reiniciar servicios. Eso evita fallos evitables por comas, llaves o tipos de dato incorrectos.",
      },
      {
        id: "json-restart",
        title: "Los cambios requieren reinicio",
        detail: "La configuracion de infraestructura no suele aplicarse en caliente. Despues de guardar, planifica el reinicio correspondiente para que el cambio tenga efecto.",
      }
    );
  }

  if (normalized.includes("/skills/") || normalized.endsWith("skill.md")) {
    recommendations.push(
      {
        id: "skill-structure",
        title: "Define claramente el workflow",
        detail: "Un skill funciona mejor cuando deja claro cuando usarlo, que herramientas combina y cual es el orden esperado de ejecucion.",
      },
      {
        id: "skill-purpose",
        title: "Evita instrucciones ambiguas",
        detail: "Si el skill resuelve un proceso repetible, describe pasos, condiciones y resultados esperados. Eso hace la ejecucion mas consistente.",
      }
    );
  }

  if (normalized.endsWith("memory.md")) {
    recommendations.push({
      id: "memory-curation",
      title: "Guarda solo memoria duradera",
      detail: "Usa este archivo para decisiones, preferencias o hechos de largo plazo. Evita convertirlo en un log diario o en una copia de la conversacion reciente.",
    });
  }

  if (normalized.endsWith("soul.md") || normalized.endsWith("identity.md") || normalized.endsWith("user.md")) {
    recommendations.push({
      id: "role-separation",
      title: "Respeta la separacion entre archivos",
      detail: "Mantener identidad, tono, contexto del usuario y reglas operativas en archivos distintos ayuda a que el agente sea mas consistente y mas facil de mantener.",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "generic",
      title: "Edita con cambios pequenos y reversibles",
      detail: "Si el archivo afecta al comportamiento del agente, prioriza cambios cortos, una sola responsabilidad por archivo y verificacion posterior al guardado.",
    });
  }

  return recommendations;
}
