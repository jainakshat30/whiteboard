const fs = require('fs');

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // In mapper.test.ts and integration.test.ts
    // The graph might be created directly without the createBaseGraph helper.
    // Let's replace 'nodes: {}' with 'nodes: []' globally just in case.
    content = content.replace(/nodes:\s*\{\}/g, 'nodes: []');
    content = content.replace(/edges:\s*\{\}/g, 'edges: []');
    
    // Sometimes there are nested objects or the tests are setting things manually.
    // Let's find any remaining graph.nodes['id']
    content = content.replace(/nodes\['([^']+)'\]\s*=\s*(\{([^}]*)\})/g, "nodes.push($2)");
    content = content.replace(/edges\['([^']+)'\]\s*=\s*(\{([^}]*)\})/g, "edges.push($2)");

    fs.writeFileSync(file, content);
}

const glob = require('glob');
const files = glob.sync('src/services/ai-diagram/**/*.test.ts');
files.forEach(processFile);

console.log('Fixed tests again');
