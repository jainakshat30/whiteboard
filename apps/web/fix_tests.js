const fs = require('fs');

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace nodes: {} with nodes: []
    content = content.replace(/nodes:\s*\{\}/g, 'nodes: []');
    content = content.replace(/edges:\s*\{\}/g, 'edges: []');
    
    // Replace graph.nodes['id'] = { ... } with graph.nodes.push({ ... })
    content = content.replace(/graph\.nodes\['([^']+)'\]\s*=\s*(\{([^}]*)\});/g, 'graph.nodes.push($2);');
    content = content.replace(/graph\.edges\['([^']+)'\]\s*=\s*(\{([^}]*)\});/g, 'graph.edges.push($2);');
    
    // Replace Object.keys(positioned.nodes).length with positioned.nodes.length
    content = content.replace(/Object\.keys\((\w+)\.nodes\)\.length/g, '$1.nodes.length');
    
    // Replace run1.nodes['n1'].x with run1.nodes.find(n => n.id === 'n1').x
    content = content.replace(/(\w+)\.nodes\['([^']+)'\]\.(\w+)/g, "$1.nodes.find(n => n.id === '$2')!.$3");
    
    // Replace expect(positioned.nodes['n1']).toBeDefined() -> expect(positioned.nodes.find(n => n.id === 'n1')).toBeDefined()
    content = content.replace(/expect\((\w+)\.nodes\['([^']+)'\]\)/g, "expect($1.nodes.find(n => n.id === '$2'))");

    fs.writeFileSync(file, content);
    console.log('Fixed', file);
}

processFile('src/services/ai-diagram/layout/__tests__/layout.test.ts');
processFile('src/services/ai-diagram/layout/__tests__/benchmark.test.ts');
processFile('src/services/ai-diagram/mapper/__tests__/mapper.test.ts');
processFile('src/services/ai-diagram/integration/__tests__/integration.test.ts');

