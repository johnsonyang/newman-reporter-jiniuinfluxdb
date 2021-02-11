A custom reporter is a Node module with a name of the form newman-reporter-<name>


Navigate to a directory of your choice, and create a blank npm package with npm init.
Add an index.js file, that exports a function of the following form:
```js
function CustomNewmanReporter (emitter, reporterOptions, collectionRunOptions) {
  // emitter is an event emitter that triggers the following events: https://github.com/postmanlabs/newman#newmanrunevents
  // reporterOptions is an object of the reporter specific options. See usage examples below for more details.
  // collectionRunOptions is an object of all the collection run options: https://github.com/postmanlabs/newman#newmanrunoptions-object--callback-function--run-eventemitter
}
module.exports = CustomNewmanReporter
```

To use your reporter locally, use the npm pack command to create a .tgz file. Once created, this can be installed using the npm i -g newman-reporter-<name>.<version>.tgz command.