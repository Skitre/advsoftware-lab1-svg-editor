/** The four extension points, named as in a plugin manifest's `contributes`. */
export type ExtensionCategory = 'shapes' | 'commands' | 'decorators' | 'attributes';

export const extensionCategories: readonly ExtensionCategory[] = ['shapes', 'commands', 'decorators', 'attributes'];
