const chalk = require('chalk');

/**
 * OAuth Debugging Utility
 * Provides comprehensive logging and analysis for OAuth flow issues
 */
class OAuthDebugger {
  constructor(platform = 'Instagram') {
    this.platform = platform;
    this.logs = [];
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
  }

  /**
   * Log a step in the OAuth flow
   */
  logStep(step, data = {}) {
    const timestamp = Date.now() - this.startTime;
    const logEntry = {
      timestamp,
      step,
      data,
      time: new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    
    console.log(chalk.blue(`\n[OAuth Debug ${this.platform}] Step: ${step}`));
    console.log(chalk.gray(`Time: +${timestamp}ms`));
    if (Object.keys(data).length > 0) {
      console.log(chalk.gray('Data:'), JSON.stringify(data, null, 2));
    }
  }

  /**
   * Log an error
   */
  logError(step, error, context = {}) {
    const timestamp = Date.now() - this.startTime;
    const errorEntry = {
      timestamp,
      step,
      error: {
        message: error.message || error,
        code: error.code || error.response?.data?.error?.code,
        subcode: error.response?.data?.error?.error_subcode,
        type: error.response?.data?.error?.type,
        fbTraceId: error.response?.data?.error?.fbtrace_id,
        fullResponse: error.response?.data
      },
      context,
      time: new Date().toISOString()
    };
    
    this.errors.push(errorEntry);
    
    console.log(chalk.red(`\n[OAuth Debug ${this.platform}] ERROR at ${step}`));
    console.log(chalk.gray(`Time: +${timestamp}ms`));
    console.log(chalk.red('Error:'), error.message || error);
    
    if (error.response?.data) {
      console.log(chalk.red('API Response:'), JSON.stringify(error.response.data, null, 2));
    }
    
    if (Object.keys(context).length > 0) {
      console.log(chalk.gray('Context:'), JSON.stringify(context, null, 2));
    }
  }

  /**
   * Log a warning
   */
  logWarning(step, message, data = {}) {
    const timestamp = Date.now() - this.startTime;
    const warningEntry = {
      timestamp,
      step,
      message,
      data,
      time: new Date().toISOString()
    };
    
    this.warnings.push(warningEntry);
    
    console.log(chalk.yellow(`\n[OAuth Debug ${this.platform}] WARNING at ${step}`));
    console.log(chalk.gray(`Time: +${timestamp}ms`));
    console.log(chalk.yellow('Message:'), message);
    if (Object.keys(data).length > 0) {
      console.log(chalk.gray('Data:'), JSON.stringify(data, null, 2));
    }
  }

  /**
   * Analyze token format
   */
  analyzeToken(token, label = 'Token') {
    if (!token) {
      this.logWarning('Token Analysis', `${label} is null or undefined`);
      return;
    }

    const analysis = {
      length: token.length,
      hasWhitespace: /\s/.test(token),
      hasNewlines: /\n/.test(token),
      hasTabs: /\t/.test(token),
      startsWithSpace: token[0] === ' ',
      endsWithSpace: token[token.length - 1] === ' ',
      preview: token.substring(0, 20) + '...' + token.substring(token.length - 10),
      characterCodes: {
        first: token.charCodeAt(0),
        last: token.charCodeAt(token.length - 1)
      }
    };

    this.logStep(`${label} Analysis`, analysis);

    if (analysis.hasWhitespace || analysis.hasNewlines || analysis.hasTabs) {
      this.logWarning(
        'Token Format Issue',
        `${label} contains whitespace characters that may cause API errors`,
        analysis
      );
    }

    return analysis;
  }

  /**
   * Analyze Meta API error code 190
   */
  analyzeError190(error, context = {}) {
    const errorData = error.response?.data?.error || {};
    const errorCode = errorData.code;
    const errorSubcode = errorData.error_subcode;
    const errorMessage = errorData.message || '';

    console.log(chalk.red('\n========================================'));
    console.log(chalk.red('META ERROR CODE 190 ANALYSIS'));
    console.log(chalk.red('========================================\n'));

    const diagnosis = {
      errorCode,
      errorSubcode,
      errorMessage,
      rootCause: 'Unknown',
      technicalReason: '',
      fix: '',
      appSettingsFix: '',
      codeChanges: []
    };

    // Analyze based on error message patterns
    if (errorMessage.includes('Cannot parse access token')) {
      diagnosis.rootCause = 'Token Corruption or Format Issue';
      diagnosis.technicalReason = 'The access token contains invalid characters, whitespace, or was corrupted during storage/transmission. Meta\'s API cannot parse the token string.';
      diagnosis.fix = 'Ensure tokens are sanitized (remove all whitespace) before storage and API calls. Check encryption/decryption process.';
      diagnosis.codeChanges = [
        'Add token.replace(/\\s+/g, \'\').trim() before all API calls',
        'Verify encryption service doesn\'t add padding or newlines',
        'Check database schema allows sufficient length for tokens'
      ];
    } else if (errorMessage.includes('Invalid OAuth access token')) {
      diagnosis.rootCause = 'Token Expired or Revoked';
      diagnosis.technicalReason = 'The token has expired, been revoked by the user, or was generated for a different app.';
      diagnosis.fix = 'User must reconnect their Instagram account through OAuth flow.';
      diagnosis.appSettingsFix = 'Verify App ID matches the one used to generate the token.';
    } else if (errorMessage.includes('Session has expired')) {
      diagnosis.rootCause = 'Token Expiration';
      diagnosis.technicalReason = 'Long-lived token (60 days) has expired and was not refreshed in time.';
      diagnosis.fix = 'Implement automatic token refresh 7 days before expiration.';
      diagnosis.codeChanges = [
        'Enable token-refresh.service.js background service',
        'Check tokenExpiresAt field in database',
        'Verify refresh logic runs before expiration'
      ];
    } else if (errorMessage.includes('Error validating application')) {
      diagnosis.rootCause = 'App Configuration Mismatch';
      diagnosis.technicalReason = 'Token was generated for a different Facebook/Instagram app, or app settings have changed.';
      diagnosis.appSettingsFix = 'Verify INSTAGRAM_CLIENT_ID matches the app that generated the token. Check app is not in Development Mode restricting access.';
    } else if (errorMessage.includes('redirect_uri')) {
      diagnosis.rootCause = 'Redirect URI Mismatch';
      diagnosis.technicalReason = 'The redirect_uri used in token exchange doesn\'t match the one registered in Facebook App Settings.';
      diagnosis.appSettingsFix = `Add exact redirect URI to Facebook App Settings: ${context.redirectUri || 'Check OAUTH_REDIRECT_BASE_URL in .env'}`;
    } else if (errorMessage.includes('scope')) {
      diagnosis.rootCause = 'Missing or Invalid Scopes';
      diagnosis.technicalReason = 'Required permissions not granted or scope names changed (Jan 27, 2025 update).';
      diagnosis.appSettingsFix = 'Ensure these scopes are requested: instagram_business_basic, instagram_business_manage_comments, instagram_business_manage_messages, instagram_business_content_publish';
    }

    console.log(chalk.yellow('Root Cause:'), diagnosis.rootCause);
    console.log(chalk.yellow('Technical Reason:'), diagnosis.technicalReason);
    console.log(chalk.green('\nFix Instructions:'), diagnosis.fix);
    
    if (diagnosis.appSettingsFix) {
      console.log(chalk.green('App Settings Fix:'), diagnosis.appSettingsFix);
    }
    
    if (diagnosis.codeChanges.length > 0) {
      console.log(chalk.green('\nCode Changes Needed:'));
      diagnosis.codeChanges.forEach((change, i) => {
        console.log(chalk.green(`  ${i + 1}. ${change}`));
      });
    }

    console.log(chalk.red('\n========================================\n'));

    return diagnosis;
  }

  /**
   * Generate comprehensive debug report
   */
  generateReport() {
    const duration = Date.now() - this.startTime;
    
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.cyan(`${this.platform} OAuth Debug Report`));
    console.log(chalk.cyan('========================================\n'));

    console.log(chalk.white('Duration:'), `${duration}ms`);
    console.log(chalk.white('Total Steps:'), this.logs.length);
    console.log(chalk.white('Errors:'), this.errors.length);
    console.log(chalk.white('Warnings:'), this.warnings.length);

    if (this.logs.length > 0) {
      console.log(chalk.cyan('\n--- Flow Steps ---'));
      this.logs.forEach((log, i) => {
        console.log(chalk.gray(`${i + 1}. [+${log.timestamp}ms] ${log.step}`));
      });
    }

    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\n--- Warnings ---'));
      this.warnings.forEach((warning, i) => {
        console.log(chalk.yellow(`${i + 1}. [+${warning.timestamp}ms] ${warning.step}: ${warning.message}`));
      });
    }

    if (this.errors.length > 0) {
      console.log(chalk.red('\n--- Errors ---'));
      this.errors.forEach((error, i) => {
        console.log(chalk.red(`${i + 1}. [+${error.timestamp}ms] ${error.step}`));
        console.log(chalk.red(`   Error: ${error.error.message}`));
        if (error.error.code) {
          console.log(chalk.red(`   Code: ${error.error.code}`));
        }
        if (error.error.subcode) {
          console.log(chalk.red(`   Subcode: ${error.error.subcode}`));
        }
      });

      // Analyze first error code 190
      const error190 = this.errors.find(e => e.error.code === 190);
      if (error190) {
        console.log(chalk.red('\n--- Error 190 Detected ---'));
        this.analyzeError190({ response: { data: { error: error190.error } } }, error190.context);
      }
    }

    console.log(chalk.cyan('\n========================================\n'));

    return {
      duration,
      logs: this.logs,
      errors: this.errors,
      warnings: this.warnings,
      success: this.errors.length === 0
    };
  }

  /**
   * Export logs as JSON for analysis
   */
  exportLogs() {
    return {
      platform: this.platform,
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      logs: this.logs,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

module.exports = OAuthDebugger;
