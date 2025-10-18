import typescriptEslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default typescriptEslint.config({
    files: ['src/**/*.ts'],
    plugins: {
        '@typescript-eslint': typescriptEslint.plugin,
        prettier,
    },
    languageOptions: {
        parser: typescriptEslint.parser,
        parserOptions: {
            project: true,
        },
    },
    rules: {
        ...typescriptEslint.configs.recommended.rules,
        ...prettierConfig.rules,
        'prettier/prettier': ['error']
    },
});