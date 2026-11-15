// Canonical coding-agent CLI catalog and command builder for aw-app-code-agent-clis.
// Owns all CLI launch commands, resume flags, and secure/insecure mode flags
// so core (aw-workspace / aw-workspace-ui) does not hardcode per-CLI syntax.

export const ANTIGRAVITY_AGENT = {
  type: 'antigravity',
  label: 'Antigravity',
  command: 'agy',
  color: '#4285f4',
  icon: 'antigravity',
  insecureFlag: '--dangerously-skip-permissions',
  supportsInsecure: true,
  resumeFlag: '--conversation',
  resumeSubcommand: null,
  supportsSessionId: false,
  defaultInsecureOnCreate: false,
};

export const AGENT_CLIS = [
  {
    type: 'claude',
    label: 'Claude',
    command: 'claude',
    color: '#d97706',
    icon: 'bolt',
    insecureFlag: '--dangerously-skip-permissions',
    supportsInsecure: true,
    resumeFlag: '--resume',
    resumeSubcommand: null,
    supportsSessionId: true,
    defaultInsecureOnCreate: true,
  },
  {
    type: 'codex',
    label: 'Codex',
    command: 'codex',
    color: '#0ea5e9',
    icon: 'codex',
    insecureFlag: '--dangerously-bypass-approvals-and-sandbox',
    supportsInsecure: true,
    resumeFlag: null,
    resumeSubcommand: 'resume',
    supportsSessionId: false,
    defaultInsecureOnCreate: false,
  },
  {
    type: 'copilot',
    label: 'Copilot',
    command: 'copilot',
    color: '#2ea043',
    icon: 'copilot',
    insecureFlag: '--allow-all',
    supportsInsecure: true,
    resumeFlag: '--resume',
    resumeSubcommand: null,
    supportsSessionId: false,
    defaultInsecureOnCreate: false,
  },
  {
    type: 'cursor',
    label: 'Cursor',
    command: 'cursor-agent',
    color: '#7c3aed',
    icon: 'cursor',
    insecureFlag: '--approve-mcps --yolo',
    supportsInsecure: true,
    resumeFlag: '--resume',
    resumeSubcommand: null,
    supportsSessionId: false,
    defaultInsecureOnCreate: false,
  },
  ANTIGRAVITY_AGENT,
];

const CLI_MAP = new Map(AGENT_CLIS.map((cli) => [cli.type, cli]));

export function getAgentCli(agentType) {
  return CLI_MAP.get(agentType) || null;
}

export function withManagedAgentClis(configuredAgents = []) {
  const result = (configuredAgents || [])
    .filter((a) => a && a.type && a.type !== 'terminal')
    .map((a) => {
      const managed = CLI_MAP.get(a.type);
      return managed ? { ...managed, ...a } : a;
    });
  if (!result.some((a) => a.type === ANTIGRAVITY_AGENT.type)) {
    result.push({ ...ANTIGRAVITY_AGENT });
  }
  return result;
}

export function supportsInsecureMode(agentType) {
  if (agentType === 'gemini') return true;
  const cli = getAgentCli(agentType);
  return !!(cli && cli.supportsInsecure && cli.insecureFlag);
}

export function getInsecureTooltip(agentType, insecure = false) {
  if (insecure) return 'Insecure mode ON — click to disable';
  if (agentType === 'codex') {
    return 'Click to enable insecure mode (--dangerously-bypass-approvals-and-sandbox)';
  }
  if (agentType === 'gemini') {
    return 'Click to enable insecure mode (--yolo — auto-approve all tools)';
  }
  if (agentType === 'cursor') {
    return 'Click to enable insecure mode (--approve-mcps --yolo)';
  }
  if (agentType === 'copilot') {
    return 'Click to enable insecure mode (--allow-all)';
  }
  if (agentType === 'antigravity') {
    return 'Click to enable insecure mode (--dangerously-skip-permissions)';
  }
  return 'Click to enable insecure mode (skip all permission checks)';
}

function makeUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function buildAgentCommand(
  agentType,
  resumeSessionId = null,
  isInsecure = false,
  _sessionName = null,
  preGeneratedId = null,
  fallbackCommand = null,
) {
  if (agentType === 'gemini') {
    let cmd = 'gemini';
    if (resumeSessionId) {
      cmd += ` --resume ${resumeSessionId}`;
    } else {
      const newId = preGeneratedId || makeUuid();
      cmd += ` --session-id ${newId}`;
    }
    if (isInsecure) cmd += ' --yolo';
    return cmd;
  }

  const cli = getAgentCli(agentType);
  if (!cli) {
    return fallbackCommand || agentType;
  }

  let cmd = fallbackCommand || cli.command;
  if (resumeSessionId) {
    if (cli.resumeSubcommand) {
      cmd += ` ${cli.resumeSubcommand} ${resumeSessionId}`;
    } else if (cli.resumeFlag) {
      cmd += ` ${cli.resumeFlag} ${resumeSessionId}`;
    }
  } else if (cli.supportsSessionId) {
    const newId = preGeneratedId || makeUuid();
    cmd += ` --session-id ${newId}`;
  }

  if (isInsecure && cli.insecureFlag) {
    cmd += ` ${cli.insecureFlag}`;
  }
  return cmd;
}
