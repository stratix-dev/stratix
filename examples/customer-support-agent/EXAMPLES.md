# Ejemplos de Uso del Customer Support Agent

Este documento proporciona ejemplos prácticos y casos de uso reales del agente de soporte al cliente.

## Tabla de Contenidos

1. [Configuración Básica](#configuración-básica)
2. [Ejemplo 1: Consulta de Facturación](#ejemplo-1-consulta-de-facturación)
3. [Ejemplo 2: Problema Técnico](#ejemplo-2-problema-técnico)
4. [Ejemplo 3: Escalación Automática](#ejemplo-3-escalación-automática)
5. [Ejemplo 4: Auto-Categorización](#ejemplo-4-auto-categorización)
6. [Ejemplo 5: Historial de Interacciones](#ejemplo-5-historial-de-interacciones)
7. [Ejemplo 6: Eventos de Dominio](#ejemplo-6-eventos-de-dominio)
8. [Ejemplo 7: Análisis de Métricas](#ejemplo-7-análisis-de-métricas)

## Configuración Básica

```typescript
import { CustomerSupportContext } from './CustomerSupportContext.js';
import type { HandleCustomerInquiryCommand } from './application/commands/HandleCustomerInquiry.js';

// Crear el contexto
const context = new CustomerSupportContext();

// Obtener handlers
const inquiryHandler = context.getInquiryHandler();
const historyHandler = context.getHistoryHandler();
const agent = context.getAgent();
```

## Ejemplo 1: Consulta de Facturación

### Escenario
Un cliente pregunta sobre un cargo duplicado.

### Código

```typescript
async function handleBillingInquiry() {
  const command: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId: 'cust-12345',
      inquiryText: 'I was charged twice for order #12345. Can you help me get a refund?',
      category: 'billing',
    },
  };

  const result = await inquiryHandler.handle(command);

  if (result.isSuccess) {
    console.log('Response:', result.value.responseText);
    console.log('Escalation Required:', result.value.escalationRequired);
    console.log('Confidence:', result.value.confidence);
    console.log('Suggested Actions:', result.value.suggestedActions);

    // Registrar en historial
    context.getHistoryService().record(command.inquiry.customerId, {
      timestamp: new Date(),
      inquiry: command.inquiry.inquiryText,
      response: result.value.responseText,
      category: result.value.category,
      escalated: result.value.escalationRequired,
    });
  } else {
    console.error('Error:', result.error.message);
  }
}

handleBillingInquiry();
```

### Salida Esperada

```
Response: Thank you for reaching out about your billing inquiry. I'll help you resolve this issue. Based on your description, I'm looking into your account details and transaction history to provide you with the best solution.

Escalation Required: false
Confidence: 0.85

Suggested Actions:
  - Review your recent transaction history
  - Check your email for payment confirmations
  - Contact us if charges are still unclear after review
```

### Análisis

- **Categorización**: Automáticamente detectada como 'billing'
- **Escalación**: No requerida para consultas estándar de facturación
- **Confianza**: Alta (0.85) debido a categoría explícita
- **Acciones**: Proporciona pasos claros al cliente

## Ejemplo 2: Problema Técnico

### Escenario
Cliente reporta que la aplicación se cae al subir fotos.

### Código

```typescript
async function handleTechnicalIssue() {
  const command: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId: 'cust-67890',
      inquiryText: 'The app keeps crashing every time I try to upload photos. What should I do?',
      category: 'technical',
    },
  };

  const result = await inquiryHandler.handle(command);

  if (result.isSuccess) {
    console.log('=== Technical Support Response ===');
    console.log('Category:', result.value.category);
    console.log('Response:', result.value.responseText);
    console.log('\nTroubleshooting Steps:');
    result.value.suggestedActions.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action}`);
    });
  }
}

handleTechnicalIssue();
```

### Salida Esperada

```
=== Technical Support Response ===
Category: technical
Response: I understand you're experiencing a technical issue. Let me help you troubleshoot this. I've reviewed our knowledge base and have found some solutions that should help resolve your problem.

Troubleshooting Steps:
  1. Try the suggested troubleshooting steps
  2. Clear your browser cache and cookies
  3. Update to the latest version of the app
  4. Contact us if the issue persists
```

## Ejemplo 3: Escalación Automática

### Escenario
Cliente molesto que requiere atención inmediata.

### Código

```typescript
async function handleEscalation() {
  // Caso 1: Complaint (siempre escala)
  const complaint: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId: 'cust-111',
      inquiryText: 'This is unacceptable! I have been waiting for 2 weeks with no response!',
      category: 'complaint',
    },
  };

  const result1 = await inquiryHandler.handle(complaint);
  console.log('Complaint - Escalation Required:', result1.value?.escalationRequired);

  // Caso 2: Palabra clave urgente
  const urgent: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId: 'cust-222',
      inquiryText: 'URGENT: I need immediate help with my account!',
      category: 'general',
    },
  };

  const result2 = await inquiryHandler.handle(urgent);
  console.log('Urgent - Escalation Required:', result2.value?.escalationRequired);

  // Caso 3: Múltiples intentos previos
  const repeated: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId: 'cust-333',
      inquiryText: 'Still having the same problem',
      category: 'technical',
      previousContext: [
        'Attempt 1: Cleared cache - issue persists',
        'Attempt 2: Updated app - issue persists',
        'Attempt 3: Reinstalled - issue persists',
      ],
    },
  };

  const result3 = await inquiryHandler.handle(repeated);
  console.log('Repeated - Escalation Required:', result3.value?.escalationRequired);
  console.log('Previous attempts:', repeated.inquiry.previousContext?.length);
}

handleEscalation();
```

### Salida Esperada

```
Complaint - Escalation Required: true
Urgent - Escalation Required: true
Repeated - Escalation Required: true
Previous attempts: 3
```

### Reglas de Escalación

1. **Complaints**: Siempre escalan
2. **Palabras urgentes**: urgent, emergency, immediately, asap
3. **Intentos múltiples**: 3 o más contextos previos

## Ejemplo 4: Auto-Categorización

### Escenario
El agente categoriza automáticamente basado en el texto.

### Código

```typescript
async function demonstrateAutoCategorization() {
  const examples = [
    {
      text: 'I need a refund for my payment',
      expected: 'billing',
    },
    {
      text: 'The app shows an error when I click submit',
      expected: 'technical',
    },
    {
      text: 'This is terrible service! Unacceptable!',
      expected: 'complaint',
    },
    {
      text: 'How do I change my password?',
      expected: 'general',
    },
  ];

  for (const example of examples) {
    const command: HandleCustomerInquiryCommand = {
      inquiry: {
        customerId: 'cust-test',
        inquiryText: example.text,
        // NO category specified - let agent categorize
      },
    };

    const result = await inquiryHandler.handle(command);

    if (result.isSuccess) {
      const match = result.value.category === example.expected ? '✓' : '✗';
      console.log(`${match} "${example.text}"`);
      console.log(`   Expected: ${example.expected}, Got: ${result.value.category}`);
      console.log(`   Confidence: ${result.value.confidence}\n`);
    }
  }
}

demonstrateAutoCategorization();
```

### Salida Esperada

```
✓ "I need a refund for my payment"
   Expected: billing, Got: billing
   Confidence: 0.85

✓ "The app shows an error when I click submit"
   Expected: technical, Got: technical
   Confidence: 0.85

✓ "This is terrible service! Unacceptable!"
   Expected: complaint, Got: complaint
   Confidence: 0.7

✓ "How do I change my password?"
   Expected: general, Got: general
   Confidence: 0.7
```

### Keywords por Categoría

**Billing:**
- charge, bill, refund, payment

**Technical:**
- crash, error, bug, not working

**Complaint:**
- angry, unacceptable, terrible, worst

**General:**
- Cualquier otra cosa

## Ejemplo 5: Historial de Interacciones

### Escenario
Consultar el historial completo de un cliente.

### Código

```typescript
async function demonstrateHistory() {
  const customerId = 'cust-12345';

  // Simular varias interacciones
  const inquiries = [
    'I was charged twice',
    'How do I request a refund?',
    'When will I receive the refund?',
  ];

  console.log('=== Creating Interactions ===');
  for (const text of inquiries) {
    const command: HandleCustomerInquiryCommand = {
      inquiry: {
        customerId,
        inquiryText: text,
      },
    };

    const result = await inquiryHandler.handle(command);

    if (result.isSuccess) {
      // Registrar en historial
      context.getHistoryService().record(customerId, {
        timestamp: new Date(),
        inquiry: text,
        response: result.value.responseText,
        category: result.value.category,
        escalated: result.value.escalationRequired,
      });

      console.log(`✓ Recorded: "${text}"`);
    }
  }

  // Consultar historial
  console.log('\n=== Customer Interaction History ===');
  const historyQuery = {
    customerId,
    limit: 10,
  };

  const history = await historyHandler.handle(historyQuery);

  if (history.isSuccess) {
    console.log(`Found ${history.value.length} interactions:\n`);

    history.value.forEach((interaction, index) => {
      console.log(`${index + 1}. ${interaction.timestamp.toISOString()}`);
      console.log(`   Category: ${interaction.category}`);
      console.log(`   Escalated: ${interaction.escalated}`);
      console.log(`   Inquiry: "${interaction.inquiry}"`);
      console.log(`   Response: "${interaction.response.substring(0, 60)}..."\n`);
    });
  }
}

demonstrateHistory();
```

### Salida Esperada

```
=== Creating Interactions ===
✓ Recorded: "I was charged twice"
✓ Recorded: "How do I request a refund?"
✓ Recorded: "When will I receive the refund?"

=== Customer Interaction History ===
Found 3 interactions:

1. 2025-12-23T17:30:15.123Z
   Category: billing
   Escalated: false
   Inquiry: "When will I receive the refund?"
   Response: "Thank you for reaching out about your billing inquiry. I'..."

2. 2025-12-23T17:30:12.456Z
   Category: billing
   Escalated: false
   Inquiry: "How do I request a refund?"
   Response: "Thank you for reaching out about your billing inquiry. I'..."

3. 2025-12-23T17:30:10.789Z
   Category: billing
   Escalated: false
   Inquiry: "I was charged twice"
   Response: "Thank you for reaching out about your billing inquiry. I'..."
```

## Ejemplo 6: Eventos de Dominio

### Escenario
Monitorear eventos del agente para auditoría y métricas.

### Código

```typescript
async function demonstrateDomainEvents() {
  const command: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId: 'cust-events',
      inquiryText: 'Test inquiry for events',
      category: 'general',
    },
  };

  // Ejecutar el agente
  const result = await inquiryHandler.handle(command);

  // Obtener eventos del agente
  if (agent.hasDomainEvents()) {
    const events = agent.pullDomainEvents();

    console.log(`=== Domain Events (${events.length} total) ===\n`);

    events.forEach((event: any, index) => {
      console.log(`Event ${index + 1}: ${event.eventType}`);
      console.log(`  Occurred At: ${event.occurredAt.toISOString()}`);
      console.log(`  Agent: ${event.agentName}`);

      if (event.eventType === 'AgentExecutionStarted') {
        console.log(`  Input: ${JSON.stringify(event.input.inquiryText)}`);
      }

      if (event.eventType === 'AgentExecutionCompleted') {
        console.log(`  Output Category: ${event.output.category}`);
        console.log(`  Duration: ${event.durationMs}ms`);
        console.log(`  Escalated: ${event.output.escalationRequired}`);
      }

      console.log('');
    });
  } else {
    console.log('No domain events available');
  }
}

demonstrateDomainEvents();
```

### Salida Esperada

```
=== Domain Events (6 total) ===

Event 1: AgentExecutionStarted
  Occurred At: 2025-12-23T17:35:00.123Z
  Agent: Customer Support Agent
  Input: "Test inquiry for events"

Event 2: AgentExecutionCompleted
  Occurred At: 2025-12-23T17:35:00.125Z
  Agent: Customer Support Agent
  Output Category: general
  Duration: 2ms
  Escalated: false
```

### Casos de Uso de Eventos

1. **Auditoría**: Registrar todas las ejecuciones
2. **Métricas**: Calcular tiempo promedio, tasa de escalación
3. **Debugging**: Rastrear problemas en producción
4. **Analytics**: Analizar patrones de uso

## Ejemplo 7: Análisis de Métricas

### Escenario
Recopilar y analizar métricas del agente.

### Código

```typescript
interface Metrics {
  totalInquiries: number;
  byCategory: Record<string, number>;
  escalationRate: number;
  averageConfidence: number;
  escalatedInquiries: number;
}

async function analyzeMetrics() {
  const testInquiries: Array<{ text: string; category?: string }> = [
    { text: 'Refund needed', category: 'billing' },
    { text: 'App crashes', category: 'technical' },
    { text: 'Terrible service!', category: 'complaint' },
    { text: 'How to use feature?', category: 'general' },
    { text: 'URGENT issue', category: 'general' },
  ];

  const results: Array<{ category: string; escalated: boolean; confidence: number }> = [];

  // Procesar todas las inquiries
  for (const inq of testInquiries) {
    const command: HandleCustomerInquiryCommand = {
      inquiry: {
        customerId: 'cust-metrics',
        inquiryText: inq.text,
        category: inq.category as any,
      },
    };

    const result = await inquiryHandler.handle(command);

    if (result.isSuccess) {
      results.push({
        category: result.value.category,
        escalated: result.value.escalationRequired,
        confidence: result.value.confidence,
      });
    }
  }

  // Calcular métricas
  const metrics: Metrics = {
    totalInquiries: results.length,
    byCategory: {},
    escalationRate: 0,
    averageConfidence: 0,
    escalatedInquiries: 0,
  };

  results.forEach((r) => {
    // Contar por categoría
    metrics.byCategory[r.category] = (metrics.byCategory[r.category] || 0) + 1;

    // Contar escalaciones
    if (r.escalated) {
      metrics.escalatedInquiries++;
    }

    // Sumar confianza
    metrics.averageConfidence += r.confidence;
  });

  // Calcular promedios
  metrics.escalationRate = (metrics.escalatedInquiries / metrics.totalInquiries) * 100;
  metrics.averageConfidence = metrics.averageConfidence / metrics.totalInquiries;

  // Mostrar métricas
  console.log('=== Agent Metrics ===\n');
  console.log(`Total Inquiries: ${metrics.totalInquiries}`);
  console.log(`Escalated: ${metrics.escalatedInquiries} (${metrics.escalationRate.toFixed(1)}%)`);
  console.log(`Average Confidence: ${metrics.averageConfidence.toFixed(2)}\n`);

  console.log('By Category:');
  Object.entries(metrics.byCategory).forEach(([category, count]) => {
    const percentage = ((count / metrics.totalInquiries) * 100).toFixed(1);
    console.log(`  ${category}: ${count} (${percentage}%)`);
  });
}

analyzeMetrics();
```

### Salida Esperada

```
=== Agent Metrics ===

Total Inquiries: 5
Escalated: 2 (40.0%)
Average Confidence: 0.79

By Category:
  billing: 1 (20.0%)
  technical: 1 (20.0%)
  complaint: 1 (20.0%)
  general: 2 (40.0%)
```

## Mejores Prácticas

### 1. Siempre Verificar Result

```typescript
const result = await inquiryHandler.handle(command);

if (result.isSuccess) {
  // Usar result.value
} else {
  // Manejar result.error
  logger.error('Inquiry failed', { error: result.error });
}
```

### 2. Registrar en Historial

```typescript
if (result.isSuccess) {
  context.getHistoryService().record(customerId, {
    timestamp: new Date(),
    inquiry: command.inquiry.inquiryText,
    response: result.value.responseText,
    category: result.value.category,
    escalated: result.value.escalationRequired,
  });
}
```

### 3. Monitorear Eventos

```typescript
// Suscribirse a eventos para monitoring
const events = agent.pullDomainEvents();

events.forEach((event: any) => {
  if (event.eventType === 'AgentExecutionCompleted') {
    metrics.record({
      duration: event.durationMs,
      category: event.output.category,
      escalated: event.output.escalationRequired,
    });
  }
});
```

### 4. Proporcionar Contexto

```typescript
const command: HandleCustomerInquiryCommand = {
  inquiry: {
    customerId: 'cust-123',
    inquiryText: 'Still not working',
    previousContext: [
      'Previous support interaction on 2025-01-20',
      'Troubleshooting steps already attempted',
      'Issue persists after following instructions',
    ],
  },
};
```

## Casos de Uso Comunes

### Integración con Chat UI

```typescript
async function handleChatMessage(customerId: string, message: string) {
  const command: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId,
      inquiryText: message,
    },
  };

  const result = await inquiryHandler.handle(command);

  if (result.isSuccess) {
    return {
      message: result.value.responseText,
      suggestedActions: result.value.suggestedActions,
      needsHumanAgent: result.value.escalationRequired,
    };
  }

  return {
    message: 'Sorry, I encountered an error. Let me connect you with a human agent.',
    needsHumanAgent: true,
  };
}
```

### Batch Processing

```typescript
async function processBatchInquiries(inquiries: CustomerInquiry[]) {
  const results = await Promise.all(
    inquiries.map((inquiry) =>
      inquiryHandler.handle({ inquiry })
    )
  );

  const summary = {
    total: results.length,
    successful: results.filter((r) => r.isSuccess).length,
    escalated: results.filter((r) => r.value?.escalationRequired).length,
  };

  return { results, summary };
}
```

### Routing Automático

```typescript
async function routeInquiry(inquiry: CustomerInquiry) {
  const command: HandleCustomerInquiryCommand = { inquiry };
  const result = await inquiryHandler.handle(command);

  if (result.isSuccess) {
    if (result.value.escalationRequired) {
      await notifyHumanAgent(inquiry, result.value);
    }

    if (result.value.category === 'billing') {
      await notifyBillingTeam(inquiry);
    }

    if (result.value.category === 'technical') {
      await createTechnicalTicket(inquiry);
    }
  }
}
```

## Conclusión

Estos ejemplos demuestran:

✅ Uso básico del agente
✅ Auto-categorización inteligente
✅ Detección de escalación
✅ Gestión de historial
✅ Eventos de dominio
✅ Análisis de métricas
✅ Patrones de integración

Para más información, consulta:
- [README.md](./README.md) - Documentación principal
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detalles de arquitectura
