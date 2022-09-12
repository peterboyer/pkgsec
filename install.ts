import assert from "assert";
import fs from "fs";
import path from "path";

interface Injection {
  body: string;
  insertAfter: string;
}

const injections: Injection[] = [
  {
    insertAfter: `  PackageInstallScripts.prototype.getArtifacts = function getArtifacts() {
    return this.artifacts;
  };`,
    body: `
const pkgsec = {
  rootPackageJson: undefined,
  getRootPackageJson: function(ctx) {
    if (!this.rootPackageJson) {
      const rootPackageJsonPath = ctx._reference.config.cwd + "/package.json";
      this.rootPackageJson = require(rootPackageJsonPath);
      return this.rootPackageJson;
    }
    return this.rootPackageJson;
  },
  reported: new Map(), // Map<string:PackageName, Map<string:ScriptName, string:ScriptBody>>
  report: function(options) {
    const { packageName, scriptName, scriptBody } = options;
    const reported = this.reported;
    let packageScripts = reported.get(packageName);
    if (!packageScripts) {
      packageScripts = new Map();
    }
    packageScripts.set(scriptName, scriptBody);
    reported.set(packageName, packageScripts);
  },
  summary: function() {
    const reported = this.reported;
    if (!reported.size) {
      return;
    }
    reported.forEach((packageScripts, packageName) => {
      const output = [];
      output.push(packageName);
      packageScripts.forEach((scriptBody, scriptName) => {
        output.push(\`  blocked: \${scriptName} "\${scriptBody}"\`);
      });
      console.log(output.join("\\n"));
    })
  }
}
globalThis.pkgsec = pkgsec;
`
  },
  {
    insertAfter: `PackageInstallScripts.prototype.getInstallCommands = function getInstallCommands(pkg) {
    var scripts = pkg.scripts;
    if (scripts) {
      var cmds = [];`,
    body: `
const { pkgsec } = globalThis;
const rootPackageJson = pkgsec.getRootPackageJson(pkg);
const packagePermissions = rootPackageJson.permissions && rootPackageJson.permissions[pkg.name];
`
  },
  {
    insertAfter: `var stage = _ref;
        var cmd = scripts[stage];
        if (cmd) {`,
    body: `
const reportOptions = {
  packageName: pkg.name,
  scriptName: stage,
  scriptBody: cmd
};
if (!packagePermissions) {
  pkgsec.report(reportOptions);
  return [];
}
if (typeof packagePermissions.scripts === "boolean" && !packagePermissions.scripts) {
  pkgsec.report(reportOptions);
  continue;
}
if (typeof packagePermissions.scripts === "object" && !packagePermissions.scripts[stage]) {
  pkgsec.report(reportOptions);
  continue;
}
`
  }
]

// https://www.npmjs.com/package/replace-in-file
const reInjected = /\/\/ ! <injected>[\S\s]*?\/\/ ! <\/injected>/g;

function install() {

  const nodepath = process.env["NODE"];
  if (!nodepath) assert(nodepath);

  console.log(nodepath);
  const yarnclipath = path.resolve(nodepath, "../../lib/node_modules/yarn/lib/cli.js")

  // $HOME/.nvm/versions/node/v18.1.0/lib/node_modules/yarn/lib/cli.js
  console.log(yarnclipath);

  const yarnclijsBuffer = fs.readFileSync(yarnclipath);
  let src = yarnclijsBuffer.toString();

  // (1) purge existing injected tags (if any)
  src.replaceAll(reInjected, "");

  // (2) write injections into file
  injections.forEach(injection => {
    const { insertAfter, body } = injection;
    src = src.replace(insertAfter, insertAfter + "\n\n\/\/ ! <injected>" + body + "\/\/ ! </injected>")
  });

  // (3) save the file
  fs.writeFileSync(yarnclipath + ".test", src);
}

install();
