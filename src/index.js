#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');

// Protocol tracking storage
const PROTOCOL_LOG_PATH = path.join(process.env.HOME || '/', 'mcp', 'protocol_logs');
const SESSION_LOG = path.join(PROTOCOL_LOG_PATH, `session_${Date.now()}.json`);

// Ensure log directory exists
if (!fs.existsSync(PROTOCOL_LOG_PATH)) {
  fs.mkdirSync(PROTOCOL_LOG_PATH, { recursive: true });
}

// Session tracking state
let sessionState = {
  sessionId: `session_${Date.now()}`,
  startTime: new Date().toISOString(),
  protocolsFollowed: [],
  protocolsSkipped: [],
  documentsRead: [],
  activitiesPerformed: [],
  complianceScore: 0,
  violations: []
};

// Log the current session violation that prompted this tool creation
sessionState.violations.push({
  timestamp: '2025-07-28T19:53:00Z',
  violation: 'Complete bypass of initialization protocols during tool exploration',
  severity: 'high',
  protocolName: 'brain_init_sequence',
  details: 'Claude performed comprehensive tool testing without following documented boot sequence'
});

// Known protocols and their requirements
const KNOWN_PROTOCOLS = {
  'brain_init_sequence': {
    name: 'Brain Initialization Protocol',
    required: true,
    steps: [
      'brain_init()',
      'read Brain Init Instructions',
      'read Boot Loader Index', 
      'read Master Architecture Index',
      'read Brain System Architecture',
      'read Master Protocol Index'
    ]
  },
  'architecture_maintenance': {
    name: 'Architecture Maintenance Protocol',
    required: true,
    triggers: ['system_creation', 'system_modification', 'issue_discovery']
  },
  'session_handover': {
    name: 'Session Handover Protocol',
    required: false,
    triggers: ['session_end', 'context_switch']
  }
};

const server = new Server(
  {
    name: 'mcp-protocol-tracker',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper functions
function logActivity(activity) {
  sessionState.activitiesPerformed.push({
    timestamp: new Date().toISOString(),
    ...activity
  });
  saveSessionLog();
}

function logProtocolStep(protocolName, step, status = 'completed') {
  const protocol = sessionState.protocolsFollowed.find(p => p.name === protocolName) || {
    name: protocolName,
    startTime: new Date().toISOString(),
    steps: []
  };
  
  protocol.steps.push({
    step,
    status,
    timestamp: new Date().toISOString()
  });
  
  if (!sessionState.protocolsFollowed.find(p => p.name === protocolName)) {
    sessionState.protocolsFollowed.push(protocol);
  }
  
  saveSessionLog();
}

function logViolation(violation) {
  sessionState.violations.push({
    timestamp: new Date().toISOString(),
    ...violation
  });
  saveSessionLog();
}

function saveSessionLog() {
  try {
    fs.writeFileSync(SESSION_LOG, JSON.stringify(sessionState, null, 2));
  } catch (error) {
    console.error('Failed to save session log:', error.message);
  }
}

function calculateComplianceScore() {
  const totalRequired = Object.values(KNOWN_PROTOCOLS).filter(p => p.required).length;
  const completed = sessionState.protocolsFollowed.filter(p => 
    KNOWN_PROTOCOLS[p.name] && KNOWN_PROTOCOLS[p.name].required
  ).length;
  
  const baseScore = totalRequired > 0 ? (completed / totalRequired) * 70 : 70;
  const violationPenalty = Math.min(sessionState.violations.length * 10, 30);
  
  return Math.max(0, Math.round(baseScore - violationPenalty));
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'protocol_start_session',
        description: 'Start tracking a new protocol session',
        inputSchema: {
          type: 'object',
          properties: {
            sessionType: {
              type: 'string',
              description: 'Type of session (initialization, work, exploration, etc.)',
            },
            expectedProtocols: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of protocols expected to be followed',
            },
          },
          required: ['sessionType'],
        },
      },
      {
        name: 'protocol_log_step',
        description: 'Log completion of a protocol step',
        inputSchema: {
          type: 'object',
          properties: {
            protocolName: {
              type: 'string',
              description: 'Name of the protocol',
            },
            step: {
              type: 'string', 
              description: 'Description of the step completed',
            },
            status: {
              type: 'string',
              enum: ['completed', 'skipped', 'failed'],
              description: 'Status of the step',
            },
          },
          required: ['protocolName', 'step'],
        },
      },
      {
        name: 'protocol_log_activity',
        description: 'Log any significant activity or tool usage',
        inputSchema: {
          type: 'object',
          properties: {
            activity: {
              type: 'string',
              description: 'Description of the activity',
            },
            tool: {
              type: 'string',
              description: 'Tool or function used',
            },
            context: {
              type: 'string',
              description: 'Context or purpose of the activity',
            },
          },
          required: ['activity'],
        },
      },
      {
        name: 'protocol_log_violation',
        description: 'Log a protocol violation or compliance issue',
        inputSchema: {
          type: 'object',
          properties: {
            violation: {
              type: 'string',
              description: 'Description of the violation',
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Severity of the violation',
            },
            protocolName: {
              type: 'string',
              description: 'Name of the protocol violated',
            },
          },
          required: ['violation', 'severity'],
        },
      },
      {
        name: 'protocol_check_compliance',
        description: 'Check current protocol compliance status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'protocol_get_session_report',
        description: 'Get comprehensive session activity report',
        inputSchema: {
          type: 'object',
          properties: {
            includeDetails: {
              type: 'boolean',
              description: 'Include detailed step-by-step breakdown',
            },
          },
        },
      },
      {
        name: 'protocol_suggest_missing',
        description: 'Suggest missing protocol steps based on current activity',
        inputSchema: {
          type: 'object',
          properties: {
            currentContext: {
              type: 'string',
              description: 'Current work context or situation',
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'protocol_start_session': {
      const { sessionType, expectedProtocols = [] } = request.params.arguments;
      
      sessionState.sessionType = sessionType;
      sessionState.expectedProtocols = expectedProtocols;
      
      logActivity({
        activity: 'Session started',
        sessionType,
        expectedProtocols
      });
      
      return {
        content: [{
          type: 'text',
          text: `📋 Protocol tracking session started\n\nSession ID: ${sessionState.sessionId}\nType: ${sessionType}\nExpected protocols: ${expectedProtocols.join(', ') || 'None specified'}\n\nUse protocol_log_step to track protocol compliance.`
        }]
      };
    }
    
    case 'protocol_log_step': {
      const { protocolName, step, status = 'completed' } = request.params.arguments;
      
      logProtocolStep(protocolName, step, status);
      
      return {
        content: [{
          type: 'text',
          text: `✅ Protocol step logged\n\nProtocol: ${protocolName}\nStep: ${step}\nStatus: ${status}\nTime: ${new Date().toLocaleTimeString()}`
        }]
      };
    }
    
    case 'protocol_log_activity': {
      const { activity, tool, context } = request.params.arguments;
      
      logActivity({ activity, tool, context });
      
      return {
        content: [{
          type: 'text',
          text: `📝 Activity logged: ${activity}\nTool: ${tool || 'N/A'}\nContext: ${context || 'N/A'}`
        }]
      };
    }
    
    case 'protocol_log_violation': {
      const { violation, severity, protocolName } = request.params.arguments;
      
      logViolation({ violation, severity, protocolName });
      
      return {
        content: [{
          type: 'text',
          text: `🚨 Protocol violation logged\n\nViolation: ${violation}\nSeverity: ${severity}\nProtocol: ${protocolName || 'General'}\n\nThis will affect your compliance score.`
        }]
      };
    }
    
    case 'protocol_check_compliance': {
      const score = calculateComplianceScore();
      sessionState.complianceScore = score;
      
      const status = score >= 80 ? '✅ Excellent' : 
                    score >= 60 ? '⚠️ Good' : 
                    score >= 40 ? '🔶 Poor' : '❌ Critical';
      
      return {
        content: [{
          type: 'text',
          text: `📊 Protocol Compliance Report\n\nCompliance Score: ${score}/100 ${status}\n\nProtocols Followed: ${sessionState.protocolsFollowed.length}\nViolations: ${sessionState.violations.length}\nActivities Logged: ${sessionState.activitiesPerformed.length}\n\nSession Duration: ${Math.round((Date.now() - new Date(sessionState.startTime)) / 1000 / 60)} minutes`
        }]
      };
    }
    
    case 'protocol_get_session_report': {
      const { includeDetails = false } = request.params.arguments;
      
      let report = `# Protocol Tracking Session Report\n\n`;
      report += `**Session ID:** ${sessionState.sessionId}\n`;
      report += `**Type:** ${sessionState.sessionType || 'Unknown'}\n`;
      report += `**Started:** ${new Date(sessionState.startTime).toLocaleString()}\n`;
      report += `**Compliance Score:** ${calculateComplianceScore()}/100\n\n`;
      
      report += `## Summary\n`;
      report += `- Protocols followed: ${sessionState.protocolsFollowed.length}\n`;
      report += `- Activities performed: ${sessionState.activitiesPerformed.length}\n`;
      report += `- Violations: ${sessionState.violations.length}\n\n`;
      
      if (sessionState.violations.length > 0) {
        report += `## Violations\n`;
        sessionState.violations.forEach((v, i) => {
          report += `${i + 1}. **${v.severity.toUpperCase()}**: ${v.violation}\n`;
        });
        report += `\n`;
      }
      
      if (includeDetails) {
        report += `## Detailed Activity Log\n`;
        sessionState.activitiesPerformed.forEach((a, i) => {
          report += `${i + 1}. ${new Date(a.timestamp).toLocaleTimeString()}: ${a.activity}\n`;
        });
      }
      
      return {
        content: [{
          type: 'text',
          text: report
        }]
      };
    }
    
    case 'protocol_suggest_missing': {
      const { currentContext } = request.params.arguments;
      
      let suggestions = [];
      
      // Check if brain_init sequence was followed
      const hasInitSequence = sessionState.protocolsFollowed.some(p => 
        p.name.includes('brain_init') || p.name.includes('initialization')
      );
      
      if (!hasInitSequence) {
        suggestions.push('🔴 Missing: Brain initialization sequence (brain_init → Boot Loader → Architecture docs)');
      }
      
      // Check for architecture maintenance
      const hasArchMaintenance = sessionState.activitiesPerformed.some(a => 
        a.activity && a.activity.toLowerCase().includes('architecture')
      );
      
      if (currentContext && (currentContext.includes('created') || currentContext.includes('modified')) && !hasArchMaintenance) {
        suggestions.push('🔶 Consider: Architecture documentation updates based on system changes');
      }
      
      if (suggestions.length === 0) {
        suggestions.push('✅ No obvious missing protocols detected');
      }
      
      return {
        content: [{
          type: 'text',
          text: `🎯 Protocol Suggestions\n\nContext: ${currentContext || 'General'}\n\n${suggestions.join('\n')}\n\nUse protocol_log_step to track protocol compliance.`
        }]
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);

// Log the session start
logActivity({
  activity: 'Protocol tracker initialized',
  tool: 'mcp-protocol-tracker',
  context: 'System startup - Created in response to protocol compliance issue'
});

console.error('mcp-protocol-tracker MCP server running on stdio');
console.error(`Session log: ${SESSION_LOG}`);
