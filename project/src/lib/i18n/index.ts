import { common } from './dictionaries/common';
import { auth } from './dictionaries/auth';
import { layout } from './dictionaries/layout';
import { onboarding } from './dictionaries/onboarding';
import { account } from './dictionaries/account';
import { widgets } from './dictionaries/widgets';
import { admin } from './dictionaries/admin';
import { userManagement } from './dictionaries/userManagement';
import { mechanic } from './dictionaries/mechanic';
import { supplier } from './dictionaries/supplier';
import { delivery } from './dictionaries/delivery';

export type Language = 'fr' | 'ar';

export const translations: Record<Language, Record<string, unknown>> = {
  fr: {
    common: common.fr,
    auth: auth.fr,
    layout: layout.fr,
    onboarding: onboarding.fr,
    account: account.fr,
    widgets: widgets.fr,
    admin: admin.fr,
    userManagement: userManagement.fr,
    mechanic: mechanic.fr,
    supplier: supplier.fr,
    delivery: delivery.fr,
  },
  ar: {
    common: common.ar,
    auth: auth.ar,
    layout: layout.ar,
    onboarding: onboarding.ar,
    account: account.ar,
    widgets: widgets.ar,
    admin: admin.ar,
    userManagement: userManagement.ar,
    mechanic: mechanic.ar,
    supplier: supplier.ar,
    delivery: delivery.ar,
  },
};

function resolve(dict: Record<string, unknown>, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === 'string' ? value : undefined;
}

export function translate(language: Language, key: string): string {
  return (
    resolve(translations[language], key) ??
    resolve(translations.fr, key) ??
    key
  );
}
