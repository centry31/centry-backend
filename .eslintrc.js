const { builtinModules } = require('module');

module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: 'tsconfig.json',
		tsconfigRootDir: __dirname,
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint', 'import', 'simple-import-sort'],
	extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
	root: true,
	env: {
		node: true,
		jest: true,
	},
	ignorePatterns: ['.eslintrc.js'],
	rules: {
		'@typescript-eslint/interface-name-prefix': 'off',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/consistent-type-imports': [
			'error',
			{
				prefer: 'type-imports',
				disallowTypeAnnotations: false,
				fixStyle: 'separate-type-imports',
			},
		],

		// импорт-правила
		'import/no-duplicates': 'error',
		'import/order': 'off', // отключаем, чтобы не конфликтовал с simple-import-sort
		'sort-imports': 'off',

		// сортировка импортов
		'simple-import-sort/imports': [
			'error',
			{
				groups: [
					// 1) node builtin
					['^node:', `^(${builtinModules.join('|')})(/|$)`],

					// 2) DDD-слои (независимо от префикса: @spaces/application, users/domain, application/..., etc.)
					['(^|/)use-cases(/|$)'],
					['(^|/)domain(/|$)'],
					['(^|/)ports(/|$)'],
					['(^|/)(infrastructure)(/|$)'],
					['(^|/)interface(s)?(/|$)'],

					// 3) относительные (приоритет: вверх, затем текущая папка)
					['^\\.\\.(?!/?$)', '^\\.\\./', '^\\.(?!/?$)', '^\\./'],
				],
			},
		],
		'simple-import-sort/exports': 'error',
	},
};
