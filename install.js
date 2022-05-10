const packageinstallscripts_root = `
{//packageinstallscripts_root
  PackageInstallScripts.flaggedPackages = new Set();
  PackageInstallScripts.flagPackage = function flagPackage(pkg, cmds) {
    const pkgname = pkg.name;
    if (!PackageInstallScripts.flaggedPackages.has(pkgname)) {
      PackageInstallScripts.flaggedPackages.add(pkgname);
      const cmd = cmds[0];
      console.log(\`\nyarnsec:\n  \${pkgname} - blocking lifecycle command\n  [\${cmd[0]}] => "\${cmd[1]}"\`);
    }
  }
}//packageinstallscripts_root::end`

const packageinstallscripts_packagecanbeinstalled = `
{//packageinstallscripts_packagecanbeinstalled
  const rootpkg = require(pkg._reference.config.cwd + "/package.json");
  const permissions = rootpkg.permissions && rootpkg.permissions[pkg.name];
  if (!permissions) {
    PackageInstallScripts.flagPackage(pkg, cmds)
    return false;
  }
  if (!permissions.scripts) {
    PackageInstallScripts.flagPackage(pkg, cmds)
    return false;
  }
}//packageinstallscripts_packagecanbeinstalled::end`;

const child_process = require("child_process");
const _path = require("path")

const hooks = {

}

// https://www.npmjs.com/package/replace-in-file
const reRoot = /{\/\/packageinstallscripts_packagecanbeinstalled([\S\s]*)}\/\/packageinstallscripts_packagecanbeinstalled::end/g;
// const re

function install() {
  const packageinstallscripts_root_match = "PackageInstallScripts.prototype.packageCanBeInstalled = function packageCanBeInstalled"
  const packageinstallscripts_packagecanbeinstalled_match = "if (this.config.packBuiltPackages && pkg.prebuiltVariants) {"

  const yarnbinpath = child_process.spawnSync("which", ["yarn"]).stdout.toString().trim();
  const yarnclipath = _path.resolve(yarnbinpath, "../../lib/node_modules/yarn/lib/cli.js")

  // $HOME/.nvm/versions/node/v18.1.0/lib/node_modules/yarn/lib/cli.js
  console.log(yarnclipath);


}

install();
