# path: scripts/check-money-types.sh
set -euo pipefail

node <<'NODE'
const path = require('node:path');
const ts = require('typescript');

const root = process.cwd();
const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
if (configPath === undefined) {
  process.stderr.write('TypeScript configuration was not found.\n');
  process.exit(2);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error !== undefined) {
  process.stderr.write(`${ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')}\n`);
  process.exit(2);
}

const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
const sources = parsed.fileNames.filter((filename) => {
  const relative = path.relative(root, filename).split(path.sep).join('/');
  return /^(lib|services|app\/api)\//.test(relative);
});
const program = ts.createProgram(sources, parsed.options);
const checker = program.getTypeChecker();
const monetaryName = /(?:amount|total|subtotal|tax|fee|balance|price|rate_value|net|gross)/i;
const violations = new Set();

function containsNumberLike(type, visited = new Set()) {
  if (visited.has(type)) {
    return false;
  }
  visited.add(type);

  if ((type.flags & ts.TypeFlags.NumberLike) !== 0) {
    return true;
  }
  if (type.isUnionOrIntersection() && type.types.some((member) => containsNumberLike(member, visited))) {
    return true;
  }
  if ((type.objectFlags & ts.ObjectFlags.Reference) !== 0) {
    const argumentsList = checker.getTypeArguments(type);
    if (argumentsList.some((argument) => containsNumberLike(argument, visited))) {
      return true;
    }
  }
  return type.getCallSignatures().some((signature) => containsNumberLike(signature.getReturnType(), visited));
}

for (const source of program.getSourceFiles()) {
  const relative = path.relative(root, source.fileName).split(path.sep).join('/');
  if (!/^(lib|services|app\/api)\//.test(relative)) {
    continue;
  }

  function visit(node) {
    if (ts.isIdentifier(node) && monetaryName.test(node.text)) {
      const type = checker.getTypeAtLocation(node);
      if (containsNumberLike(type)) {
        const location = source.getLineAndCharacterOfPosition(node.getStart(source));
        violations.add(`${relative}:${location.line + 1}:${node.text}`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (violations.size > 0) {
  process.stderr.write('Monetary identifiers must not have number-based types:\n');
  for (const violation of [...violations].sort()) {
    process.stderr.write(`- ${violation}\n`);
  }
  process.exit(1);
}

process.stdout.write(`Money type check passed across ${sources.length} source file(s).\n`);
NODE
