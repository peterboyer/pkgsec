# PkgSec

Package Secure

- tl;dr, Defaults to preventing all dependencies (including all transitives)
  from running lifecycle scripts without being explicitly whitelisted (via. your
  package.json)

All npm packages may ship with lifecycle hooks that execute arbitrary code
(without constraint) on the package consumers machine.

Transitives dependencies (dependencies of dependencies) will also run their
lifecycle hooks when adding/installing packages for a project, meaning that one
compromised indirect dependency could compromise a package

An example is with React projects that use create-react-app (cra) which
abstracts away project scripts via the react-scripts package. this package in
itself has heaps of dependencies like `@babel/core`, `camelcase`, `webpack`,
`dotenv` etc, and they likely have dozens more dependencies under them. All it
takes is one dependency upon hundreds, as installed into a project via `npm
install` to pwn your machine with malicious code -- a supply chain attack.

There are some strategies to mitigate the risk, the easiest being running `npm
install` or `yarn install` with the `--ignore-scripts` flag. This will prevent
the execution of package lifecycle hooks completely, thus preventing a
potentially compromised package or sub-package from executing malicious code on
your machine.

However, one main drawback is that this flag ignores everything INCLUDING your
project's own scripts in `package.json`, and there are no options to specify a
most precise target to ignore (or allow) ([feature
request](https://github.com/yarnpkg/yarn/issues/7338)). And even if you don't
have any lifecycle scripts in your own project, many projects use packages such
as `esbuild` which will fail if you ignore scripts -- so you'll end up omitting
this `--ignore-scripts` flag just so you can get back to work, however the
problem still exists and the risk still at large.

And even if they did implement a way to narrow the ignore-scripts flag's scope
this feature request is defaulting deny-list approach, where everything is
allowed by default and you specify what packages to not run scripts, whereas it
would be more secure to operate with an allow-list, so that you only run scripts
of packages that you trust as specified to the install command.

Unfortunately, although this would be an effective way to stop malicious code
executing from compromised packages that previously had no lifecycle scripts,
this still means that hijacked trusted-packages are still allowed to execute new
malicious code. Some strategies:

- along with specifying trusted packages, also explicitly specify trusted
  lifecycle hooks
- along with trusted packages by name, also include a hash of the lifecycle
  script's content (to defend against inline malicious code execution), and a
  list of dependencies (such as the target .js/.sh script files) to hash for
  comparison (and the actual hashes of the target files)

These strategies are proposed in contrast to simply pinning a single "trusted"
version, because it is inevitable that you will need to update a package's
version thus you want these protections to be as unobtrusive to the user as to
avoid a user blindly bumping the trusted version pointer to the newly installed
version, thus bypassing the life-cycle script protection altogether.

These trusted properties can reside alongside the dependencies as another
`package.json` property such that it must be version controlled.

This solution would probably be best injected as a kind of hook that catches all
attempted executions of lifecycle hooks as part of an `npm` or `yarn` install,
such that all attempted executions that are not trusted will raise an exception
and prompt the user about the potentially suspicious behaviour. This would play
out as the user doing an innocent `yarn upgrade` or `upgrade-interactive` (or
equivalent in `npm`) and then noting any NEW exceptions that may indicate a
newly compromised package -- or that the build scripts have been changed by the
developer and should be noted in the documentation.

This experience can be improved through an interactive flow that guides the user
to inspect the differences between the files (due to a mismatch of hashes) to
check that nothing suspicious has been added (to indicate compromise), and if
the user is satisfied, then they may commit the new hash to the "integrity"
property within `package.json` and continue inspecting conflicting packages
until they are satisfied with their audit.

This would have the bi-product of encouraging developers to be very conservative
with updates to their lifecycle scripts, but this seems to be a small price to
pay considering that lifecycle scripts are significantly less volatile than
actual application code.

To be clear, this is a way to mitigate against supply chain attacks that execute
upon installation, almost like a 0-day -- placing malicious code into the
application code itself will still be a problem, however this intends to defend
against the huge lifecycle-scripts attack vector, whereby a user may be pwned
just by installing a project's dependency, let along by running the application
itself.
