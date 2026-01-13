import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ContextHelper } from '../helper/context.helper';

@Injectable()
export class LanguageGuard implements CanActivate {
  private readonly supportedLanguages = ['en', 'fr', 'es'];
  private readonly defaultLanguage = 'en';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Check header first, then query param, then accept-language
    let language =
      request.headers['x-language'] ||
      request.query.lang ||
      this.parseAcceptLanguage(request.headers['accept-language']);

    // Validate and normalize
    if (!language || !this.supportedLanguages.includes(language)) {
      language = this.defaultLanguage;
    }

    ContextHelper.setLanguage(language);
    
    return true;
  }

  private parseAcceptLanguage(header?: string): string | null {
    if (!header) return null;
    
    const languages = header.split(',').map((lang) => {
      const [code, priority] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(),
        priority: priority ? parseFloat(priority) : 1,
      };
    });

    languages.sort((a, b) => b.priority - a.priority);

    for (const lang of languages) {
      if (this.supportedLanguages.includes(lang.code)) {
        return lang.code;
      }
    }

    return null;
  }
}

