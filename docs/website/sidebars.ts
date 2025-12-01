import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Comprehensive sidebar configuration for Stratix documentation.
 *
 * Organized into major sections:
 * 1. Getting Started
 * 2. Stratix Copilot (VS Code Extension)
 * 3. Core Concepts
 * 4. Configuration
 * 5. Plugin System
 * 6. Providers
 * 7. Libraries
 * 8. AI Agents (AI-First Feature)
 * 9. CLI Reference
 * 10. HTTP
 * 11. Database & Persistence
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },

    // ========================================
    // 1. GETTING STARTED
    // ========================================
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/project-structure',
      ],
    },

    // ========================================
    // 2. STRATIX COPILOT (VS CODE EXTENSION)
    // ========================================
    {
      type: 'category',
      label: 'Stratix Copilot',
      collapsed: false,
      items: [
        'stratix-copilot/overview',
        'stratix-copilot/installation',
        'stratix-copilot/usage',
        'stratix-copilot/commands',
      ],
    },

    // ========================================
    // 3. CORE CONCEPTS
    // ========================================
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        'core-concepts/architecture-overview',
        'core-concepts/domain-modeling',
        'core-concepts/result-pattern',
        'core-concepts/cqrs',
        'core-concepts/contexts',
        'core-concepts/dependency-injection',
        'core-concepts/secrets-management',
        'core-concepts/dx-helpers',
        'core-concepts/mapping',
      ],
    },

    // ========================================
    // 4. CONFIGURATION
    // ========================================
    {
      type: 'category',
      label: 'Configuration',
      collapsed: false,
      items: [
        'configuration/overview',
        'configuration/env-provider',
        'configuration/file-provider',
        'configuration/composite-provider',
        'configuration/validation',
        'configuration/best-practices',
      ],
    },

    // ========================================
    // 5. PLUGIN SYSTEM
    // ========================================
    {
      type: 'category',
      label: 'Plugins',
      collapsed: true,
      items: [
        'plugins/plugin-architecture',
        'plugins/creating-plugins',
        'plugins/official-plugins',
        'plugins/plugin-configuration',
      ],
    },

    // ========================================
    // 6. PROVIDERS
    // ========================================
    {
      type: 'category',
      label: 'Providers',
      collapsed: true,
      items: [
        'providers/providers-overview',
        'providers/ai-providers',
        'providers/di-providers',
        'providers/validation-providers',
      ],
    },

    // ========================================
    // 7. LIBRARIES
    // ========================================
    {
      type: 'category',
      label: 'Libraries',
      collapsed: true,
      items: [
        'libraries/libraries-overview',
      ],
    },

    // ========================================
    // 8. AI AGENTS (AI-FIRST)
    // ========================================
    {
      type: 'category',
      label: 'AI Agents',
      collapsed: true,
      items: [
        'ai-agents/ai-agents-overview',
        'ai-agents/creating-agents',
        'ai-agents/llm-providers',
        'ai-agents/agent-tools',
        'ai-agents/agent-memory',
        'ai-agents/agent-orchestration',
        'ai-agents/agent-testing',
      ],
    },

    // ========================================
    // 9. CLI REFERENCE
    // ========================================
    {
      type: 'category',
      label: 'CLI Reference',
      collapsed: true,
      items: [
        'cli/cli-overview',
        'cli/new-command',
        'cli/generate-commands',
        'cli/add-command',
        'cli/info-command',
      ],
    },

    // ========================================
    // 10. HTTP
    // ========================================
    {
      type: 'category',
      label: 'HTTP',
      collapsed: true,
      items: [
        'http/http-client-overview',
        'http/configuration',
        'http/advanced-usage',
        'http/api-reference',
      ],
    },

    // ========================================
    // 11. DATABASE & PERSISTENCE
    // ========================================

    {
      type: 'category',
      label: 'Database & Persistence',
      collapsed: true,
      items: [
        'database/database-overview',
        'database/postgres',
        'database/mongodb',
        'database/redis',
      ],
    },
  ],
};

export default sidebars;
