/**
 * Vite plugin to validate critical environment variables at build time
 * This helps catch configuration issues during deployment instead of at runtime
 */

import type { Plugin } from 'vite';

export interface EnvValidationOptions {
  /**
   * Environment variables that must be set in production builds
   */
  requiredInProduction?: string[];
  
  /**
   * Environment variables that should be URLs
   */
  urlVariables?: string[];
  
  /**
   * Whether to fail the build on validation errors
   * Default: true for production builds
   */
  failOnError?: boolean;
}

export function validateEnvPlugin(options: EnvValidationOptions = {}): Plugin {
  const {
    requiredInProduction = [],
    urlVariables = [],
    failOnError,
  } = options;

  return {
    name: 'validate-env',
    
    config(config, { command, mode }) {
      // Only validate in production builds
      const isProduction = mode === 'production';
      const shouldFailOnError = failOnError ?? isProduction;
      
      if (!isProduction) {
        return;
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      console.log('\n🔍 Validating environment variables for production build...\n');

      // Check required variables
      for (const varName of requiredInProduction) {
        const value = process.env[varName];
        
        if (!value || value.trim() === '') {
          errors.push(
            `❌ ${varName} is not set or is empty\n` +
            `   This variable is required for production deployment.`
          );
        } else {
          console.log(`   ✅ ${varName} is set`);
        }
      }

      // Validate URL format for URL variables
      for (const varName of urlVariables) {
        const value = process.env[varName];
        
        if (value) {
          try {
            new URL(value);
            
            // Check for common mistakes
            if (!value.startsWith('http://') && !value.startsWith('https://')) {
              warnings.push(
                `⚠️  ${varName} does not start with http:// or https://\n` +
                `   Value: "${value}"\n` +
                `   This may cause issues in production.`
              );
            } else {
              console.log(`   ✅ ${varName} is a valid URL`);
            }
          } catch (e) {
            errors.push(
              `❌ ${varName} is not a valid URL\n` +
              `   Value: "${value}"\n` +
              `   URLs must include protocol (http:// or https://) and domain.`
            );
          }
        }
      }

      // Display warnings
      if (warnings.length > 0) {
        console.warn('\n⚠️  Environment Variable Warnings:\n');
        warnings.forEach(warning => console.warn(warning + '\n'));
      }

      // Display errors and potentially fail build
      if (errors.length > 0) {
        console.error('\n❌ Environment Variable Validation Failed!\n');
        errors.forEach(error => console.error(error + '\n'));
        
        console.error(
          '\n💡 To fix these issues:\n' +
          '   1. Set the missing environment variables in your deployment platform\n' +
          '   2. For Vercel: Project Settings → Environment Variables\n' +
          '   3. For Railway: Project → Variables\n' +
          '   4. Ensure all URLs include http:// or https://\n' +
          '   5. Redeploy after updating variables\n'
        );

        if (shouldFailOnError) {
          throw new Error(
            `Build failed due to ${errors.length} environment variable validation error(s). ` +
            'See above for details.'
          );
        }
      } else {
        console.log('\n✅ All environment variables validated successfully!\n');
      }
    },
  };
}
