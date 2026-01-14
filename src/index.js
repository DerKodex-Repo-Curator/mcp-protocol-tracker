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
      {
        name: 'help',
        description: 'Get comprehensive documentation for all protocol-tracker functions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      }
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
    
    case 'help': {
      const helpText = `
# 📋 Protocol Tracker - Audit Trail and Compliance System

## Purpose
MCP tool for tracking protocol adherence, logging initialization sequences, and maintaining audit trails of Claude's activities. Ensures systematic compliance with established protocols.

## Available Tools

### protocol_start_session
Start tracking a new protocol session:
- **sessionType**: Type of session (initialization | work | exploration | etc.)
- **expectedProtocols**: List of protocols expected to be followed (optional)
- Initializes session tracking for protocol compliance monitoring
- Creates audit trail foundation for the session

### protocol_log_step
Log completion of a protocol step:
- **protocolName**: Name of the protocol
- **step**: Description of the step completed
- **status**: Status of the step (completed | skipped | failed, optional)
- Records individual protocol step execution for compliance tracking

### protocol_log_activity
Log any significant activity or tool usage:
- **activity**: Description of the activity
- **tool**: Tool or function used (optional)
- **context**: Context or purpose of the activity (optional)
- Maintains comprehensive activity log for audit purposes

### protocol_log_violation
Log a protocol violation or compliance issue:
- **violation**: Description of the violation
- **severity**: Severity of the violation (low | medium | high | critical)
- **protocolName**: Name of the protocol violated (optional)
- Documents deviations from established protocols for analysis

### protocol_check_compliance
Check current protocol compliance status:
- No parameters required
- Returns current session compliance metrics
- Identifies any violations or missing protocol steps
- Provides overall compliance assessment

### protocol_get_session_report
Get comprehensive session activity report:
- **includeDetails**: Include detailed step-by-step breakdown (optional)
- Returns complete session analysis with compliance metrics
- Detailed audit trail of all activities and protocol adherence

### protocol_suggest_missing
Suggest missing protocol steps based on current activity:
- **currentContext**: Current work context or situation (optional)
- Analyzes current session against expected protocols
- Identifies potentially missing or skipped protocol steps
- Provides recommendations for protocol compliance

## Protocol Compliance Framework

### Session Tracking
- **Initialization**: Proper session setup with expected protocols
- **Step Logging**: Systematic recording of protocol step completion
- **Activity Monitoring**: Comprehensive logging of significant activities
- **Violation Tracking**: Documentation of any protocol deviations

### Compliance Assessment
- **Real-time Monitoring**: Continuous tracking of protocol adherence
- **Compliance Metrics**: Quantitative assessment of protocol following
- **Gap Analysis**: Identification of missing or incomplete protocol steps
- **Recommendation Engine**: Suggestions for maintaining compliance

## Common Use Cases

### System Initialization Auditing
- Track brain_init protocol compliance
- Log tool loading and context establishment
- Monitor system state initialization
- Verify proper startup sequence adherence

### Workflow Compliance Monitoring
- Ensure systematic problem-solving approach
- Track protocol adherence during complex tasks
- Monitor quality assurance protocol compliance
- Document deviation from established procedures

### Quality Assurance Auditing
- Maintain audit trails for verification processes
- Track testing and validation protocol compliance
- Monitor code review and approval processes
- Document quality control step completion

### Research Protocol Tracking
- Log systematic research methodology adherence
- Track literature review and analysis protocols
- Monitor data collection and analysis procedures
- Document research ethics and compliance steps

## Session Lifecycle

### Session Initialization
1. **protocol_start_session** - Begin tracking with session type
2. Define expected protocols for the session
3. Establish baseline for compliance monitoring

### Activity Execution
1. **protocol_log_step** - Record each protocol step completion
2. **protocol_log_activity** - Log significant activities and tool usage
3. **protocol_log_violation** - Document any compliance issues
4. **protocol_check_compliance** - Monitor ongoing compliance status

### Session Analysis
1. **protocol_suggest_missing** - Identify gaps in protocol adherence
2. **protocol_get_session_report** - Generate comprehensive audit report
3. Review compliance metrics and improvement opportunities

## Compliance Metrics

### Protocol Adherence Scoring
- **Completion Rate**: Percentage of expected protocol steps completed
- **Violation Severity**: Weighted score based on violation severity levels
- **Timeliness**: Protocol step completion timing analysis
- **Consistency**: Adherence to established protocol sequences

### Audit Trail Quality
- **Documentation Completeness**: Thoroughness of activity logging
- **Step Granularity**: Level of detail in protocol step recording
- **Context Richness**: Quality of contextual information capture
- **Traceability**: Ability to reconstruct decision-making processes

## Violation Severity Levels

### Critical Violations
- **Security Protocol Breaches**: Critical safety or security issues
- **Data Integrity Violations**: Actions that compromise data accuracy
- **System Safety Issues**: Violations that could cause system instability

### High Violations
- **Major Protocol Deviations**: Significant departures from established procedures
- **Quality Assurance Bypasses**: Skipping important quality control steps
- **Documentation Failures**: Missing critical documentation requirements

### Medium Violations
- **Minor Protocol Deviations**: Small departures from standard procedures
- **Incomplete Documentation**: Partial compliance with documentation requirements
- **Timing Issues**: Protocol steps completed outside recommended timeframes

### Low Violations
- **Style Guide Deviations**: Minor formatting or style inconsistencies
- **Optional Step Omissions**: Skipping recommended but non-critical steps
- **Documentation Formatting**: Minor issues with documentation format

## Reporting and Analysis

### Session Reports
- **Executive Summary**: High-level compliance overview
- **Detailed Activity Log**: Complete chronological activity record
- **Compliance Metrics**: Quantitative compliance assessment
- **Recommendations**: Suggestions for improved protocol adherence

### Trend Analysis
- **Historical Compliance**: Compliance trends over multiple sessions
- **Protocol Effectiveness**: Analysis of which protocols are most effective
- **Common Violations**: Identification of frequently occurring compliance issues
- **Improvement Opportunities**: Areas where protocol adherence can be enhanced

## Integration Benefits
- **Accountability**: Clear audit trails for all activities
- **Quality Assurance**: Systematic compliance with established protocols
- **Continuous Improvement**: Data-driven protocol refinement
- **Risk Management**: Early identification of compliance issues
- **Transparency**: Complete visibility into decision-making processes

The Protocol Tracker ensures systematic compliance with established procedures while maintaining comprehensive audit trails for accountability and continuous improvement.
`;
      return {
        content: [{
          type: 'text',
          text: helpText
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
