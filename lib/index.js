const path = require("path");
const resolve = require("resolve").sync;
const fs = require("fs");

const dependencies = Object.keys(
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json")))
    .dependencies
);

const safeResolve = (...args) => {
  let resolved;
  try {
    resolved = resolve(...args);
  } catch (err) {
    return null;
  }
  return resolved;
};

const resolveAliases = (src, aliases) => {
  const res = Object.keys(aliases).reduce(
    (acc, curr) => acc.replace(curr, aliases[curr]),
    src
  );
  return res;
};

function resolver(
  { node: { source } },
  {
    file: {
      opts: { filename }
    },
    opts: { tenant = "default", aliases = [] }
  }
) {
  if (source !== null) {
    if (dependencies.includes(source.value)) return;
    const basedir = path.dirname(filename);
    const dependency = path.resolve(
      basedir,
      resolveAliases(source.value, aliases)
    );
    const testRegex = /^(.*?)(\.[^\/][a-zA-Z0-9]+)?$/g;
    const testDependency = replacement =>
      safeResolve(dependency.replace(testRegex, replacement)) !== null;
    if (testDependency(`$1.${tenant}$2`)) {
      source.value = source.value.replace(testRegex, `$1.${tenant}$2`);
    } else if (testDependency(`$1/index.${tenant}.js`)) {
      source.value = source.value.replace(testRegex, `$1/index.${tenant}$2`);
    }
  }
}

function transformImportResolve() {
  return {
    visitor: {
      ExportNamedDeclaration: resolver,
      ImportDeclaration: resolver
    }
  };
}

module.exports = transformImportResolve;
