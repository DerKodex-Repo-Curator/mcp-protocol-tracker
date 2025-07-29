const fs = require('fs');
const path = require('path');

console.log('🧪 Running MCP Protocol Tracker Tests');
console.log('=====================================');

let passed = 0;
let total = 0;

const tests = [
  {
    name: 'Server configuration validation',
    test: () => {
      const serverCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
      return serverCode.includes('mcp-protocol-tracker') && serverCode.includes('0.1.0');
    }
  },
  {
    name: 'Required dependencies check',
    test: () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
      return packageJson.dependencies['@modelcontextprotocol/sdk'];
    }
  },
  {
    name: 'Tool definitions validity',
    test: () => {
      const serverCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
      const requiredTools = [
        'protocol_start_session',
        'protocol_log_step', 
        'protocol_log_activity',
        'protocol_check_compliance'
      ];
      return requiredTools.every(tool => serverCode.includes(tool));
    }
  },
  {
    name: 'Session log directory creation',
    test: () => {
      const serverCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
      return serverCode.includes('mkdirSync');
    }
  },
  {
    name: 'Compliance scoring function exists',
    test: () => {
      const serverCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
      return serverCode.includes('calculateComplianceScore');
    }
  },
  {
    name: 'Known protocols defined',
    test: () => {
      const serverCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
      return serverCode.includes('KNOWN_PROTOCOLS') && serverCode.includes('brain_init_sequence');
    }
  }
];

tests.forEach(({ name, test }) => {
  total++;
  try {
    const result = test();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
  }
});

console.log(`\n📊 Test Results: ${passed}/${total} passed`);

if (passed === total) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('⚠️ Some tests failed');
  process.exit(1);
}
