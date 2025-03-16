const { withDangerousMod } = require('@expo/config-plugins');
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

module.exports = function withCustomBuildGradle(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'build.gradle');
      let buildGradle = readFileSync(buildGradlePath, 'utf8');
      
      // Replace with your custom configurations
      buildGradle = buildGradle.replace(
        /buildToolsVersion = .*/,
        "buildToolsVersion = '34.0.0'"
      );
      
      buildGradle = buildGradle.replace(
        /kotlinVersion = .*/,
        "kotlinVersion = '1.7.20'"
      );
      
      buildGradle = buildGradle.replace(
        /ndkVersion = .*/,
        'ndkVersion = "26.0.10792818"'
      );
      
      // Add Firebase classpath if not present
      if (!buildGradle.includes("com.google.gms:google-services")) {
        buildGradle = buildGradle.replace(
          /dependencies \{([^}]*)\}/,
          'dependencies {$1\n        classpath("com.google.gms:google-services:4.4.0")\n    }'
        );
      }
      
      writeFileSync(buildGradlePath, buildGradle);
      return config;
    },
  ]);
};