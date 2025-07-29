# MCP Protocol Tracker

A Model Context Protocol (MCP) tool for tracking protocol adherence, logging initialization sequences, and maintaining comprehensive audit trails of Claude's activities.

## Purpose

This tool was created to address a fundamental limitation in MCP workflows: the lack of protocol adherence tracking and audit trails. It provides systematic monitoring of whether documented procedures are being followed and maintains detailed logs of all activities.

## Features

### Core Functionality
- **Session Tracking**: Detailed logging of every Claude session with unique IDs
- **Protocol Compliance Scoring**: Calculates adherence to documented procedures (0-100 scale)
- **Activity Logging**: Records every significant action with context and timestamps
- **Violation Detection**: Flags when protocols are bypassed or skipped
- **Comprehensive Reporting**: Detailed session reports with compliance metrics

### Available Tools

#### `protocol_start_session`
Start tracking a new protocol session
```javascript
{
  "sessionType": "initialization|work|exploration|debugging",
  "expectedProtocols": ["protocol1", "protocol2"] // optional
}
```

#### `protocol_log_step`
Log completion of a protocol step
```javascript
{
  "protocolName": "brain_init_sequence",
  "step": "brain_init() executed",
  "status": "completed|skipped|failed" // optional, defaults to completed
}
```

#### `protocol_log_activity`
Log any significant activity or tool usage
```javascript
{
  "activity": "Description of what was done",
  "tool": "tool_name", // optional
  "context": "Why this was done" // optional
}
```

#### `protocol_log_violation`
Log a protocol violation or compliance issue
```javascript
{
  "violation": "Description of what went wrong",
  "severity": "low|medium|high|critical",
  "protocolName": "violated_protocol" // optional
}
```

#### `protocol_check_compliance`
Check current protocol compliance status
- Returns compliance score (0-100)
- Shows protocols followed, violations, and activity count
- Provides session duration

#### `protocol_get_session_report`
Get comprehensive session activity report
```javascript
{
  "includeDetails": true|false // optional, includes detailed activity log
}
```

#### `protocol_suggest_missing`
Suggest missing protocol steps based on current activity
```javascript
{
  "currentContext": "Description of current work context"
}
```

## Compliance Scoring

**Score Calculation:**
- Base score: (Completed required protocols / Total required protocols) × 70%
- Violation penalty: Up to 30 points deducted based on severity and count
- Final range: 0-100

**Score Interpretation:**
- 80-100: ✅ Excellent
- 60-79: ⚠️ Good  
- 40-59: 🔶 Poor
- 0-39: ❌ Critical

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Add to Claude Desktop Config**
   Add to your `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "protocol-tracker": {
         "command": "node",
         "args": ["/path/to/mcp-protocol-tracker/src/index.js"],
         "description": "Protocol adherence tracking and audit trail system"
       }
     }
   }
   ```

3. **Restart Claude Desktop**

## Usage Examples

### Starting a Session
```javascript
protocol_start_session({
  "sessionType": "initialization", 
  "expectedProtocols": ["brain_init_sequence", "architecture_maintenance"]
})
```

### Logging Protocol Steps
```javascript
protocol_log_step({
  "protocolName": "brain_init_sequence",
  "step": "Read Boot Loader Index - CRITICAL"
})
```

### Checking Compliance
```javascript
protocol_check_compliance()
// Returns: Compliance Score: 60/100 ⚠️ Good
```

## Integration with Workflow

This tool integrates with Claude's workflow by:
- **Gentle Reminders**: Added to frequently-used tools like `brain_status` and `check_reminders`
- **Protocol Enforcement**: Can be extended to block actions until prerequisites are met
- **Continuous Monitoring**: Tracks all activities for post-session analysis

## Session Logs

Session logs are stored in `~/mcp/protocol_logs/session_[timestamp].json` with:
- Session metadata and timing
- Complete activity log with timestamps
- Protocol compliance tracking
- Violation records with severity levels
- Compliance score history

## Development

### Project Structure
```
mcp-protocol-tracker/
├── src/
│   └── index.js          # Main MCP server implementation
├── package.json          # Dependencies and metadata
└── README.md            # This documentation
```

### Known Protocols
The tool currently tracks these built-in protocols:
- `brain_init_sequence`: Brain initialization steps
- `architecture_maintenance`: System documentation updates
- `session_handover`: Clean context transitions

Additional protocols can be added by extending the `KNOWN_PROTOCOLS` object.

## Future Enhancements

- [ ] Git repository integration
- [ ] Automated testing suite
- [ ] Protocol auto-detection and suggestions
- [ ] Integration with Master Protocol Index
- [ ] Web dashboard for compliance trends
- [ ] Export capabilities (JSON, HTML, CSV)
- [ ] Pattern recognition for workflow optimization

## Created

July 28, 2025 - In response to identified gaps in MCP protocol adherence tracking.

## License

MIT
